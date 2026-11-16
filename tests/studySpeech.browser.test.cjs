
const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium, webkit, devices } = require('playwright');
const http = require('node:http');

function mockSpeech() {
  window.speechCalls = [];
  window.speechMode =
    new URLSearchParams(location.search).get('mode') || 'ready';

  window.voices = ['ready', 'broken-voice'].includes(window.speechMode)
    ? [{ lang: 'en-US', localService: true }]
    : [];

  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };

  const engine = new EventTarget();

  Object.assign(engine, {
    getVoices: () => window.voices,

    cancel: () => {
      window.speechCalls.push({ kind: 'cancel' });

      if (window.speechMode === 'broken-voice') {
        window.lastSpeech?.onerror?.({ error: 'canceled' });
      }
    },

    resume: () => {},

    speak: utterance => {
      window.speechCalls.push({
        kind: 'speak',
        text: utterance.text,
        lang: utterance.lang,
        voice: utterance.voice?.lang ?? null,
        rate: utterance.rate,
      });

      window.lastSpeech = utterance;

      if (window.speechMode === 'broken-voice' && utterance.voice) {
        utterance.onerror?.({ error: 'synthesis-failed' });
      } else if (window.speechMode === 'blocked') {
        utterance.onerror?.({ error: 'not-allowed' });
      } else if (window.speechMode === 'unsupported-language') {
        utterance.onerror?.({ error: 'language-unavailable' });
      } else {
        utterance.onstart?.();
      }
    },

    speaking: false,
  });

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: engine,
  });
}

test(
  'mobile speech initialization, default fallback, lifecycle and safe errors in ' +
    (process.env.SPEECH_BROWSER || 'chromium'),
  { timeout: 90000 },
  async t => {
    const js = (
      await build({
        entryPoints: ['tests/fixtures/studySpeech.jsx'],
        bundle: true,
        write: false,
        jsx: 'automatic',
        define: {
          'process.env.NODE_ENV': '"development"',
        },
      })
    ).outputFiles[0].text;

    const server = http.createServer((req, res) => {
      res.setHeader(
        'Content-Type',
        req.url.startsWith('/bundle')
          ? 'application/javascript'
          : 'text/html'
      );

      res.end(
        req.url.startsWith('/bundle')
          ? js
          : '<div id="root"></div><script type="module" src="/bundle.js"></script>'
      );
    });

    await new Promise(resolve =>
      server.listen(0, '127.0.0.1', resolve)
    );

    t.after(() => new Promise(resolve => server.close(resolve)));

    const kind = process.env.SPEECH_BROWSER || 'chromium';

    // Chromium 使用 Pixel 5 模擬 Android。
    // WebKit 使用 iPad 模擬非 Android 的既有行為。
    const isAndroid = kind === 'chromium';

    const browser = await (kind === 'webkit' ? webkit : chromium).launch(
      kind === 'webkit'
        ? { executablePath: process.env.WEBKIT_EXECUTABLE || undefined }
        : {
            executablePath:
              process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium',
          }
    );

    try {
      for (const mode of [
        'ready',
        'empty',
        'delayed',
        'poll',
        'broken-voice',
      ]) {
        const context = await browser.newContext(
          kind === 'webkit'
            ? { ...devices['iPad (gen 7)'] }
            : { ...devices['Pixel 5'] }
        );

        const errors = [];

        await context.addInitScript(mockSpeech);

        const page = await context.newPage();

        page.on('pageerror', error => {
          errors.push(error.message);
        });

        await page.goto(
          'http://127.0.0.1:' +
            server.address().port +
            '?mode=' +
            mode
        );

        const replay = page.getByRole('button', {
          name: '重新播放發音',
        });

        await replay.waitFor();

        // Android 現在直接使用系統 en-US，
        // 不必等待 voiceschanged 或語音清單輪詢。
        // iPad 則繼續驗證既有的延遲載入流程。
        if (['delayed', 'poll'].includes(mode)) {
          if (!isAndroid) {
            await page
              .getByText('正在準備語音引擎…')
              .waitFor();
          }

          await page.evaluate(
            event => {
              window.voices = [
                { lang: 'en-US', localService: true },
              ];

              if (event) {
                window.speechSynthesis.dispatchEvent(
                  new Event('voiceschanged')
                );
              }
            },
            mode === 'delayed'
          );
        }

        await page.waitForFunction(() =>
          window.speechCalls.some(call => call.kind === 'speak')
        );

        let calls = await page.evaluate(() =>
          window.speechCalls.filter(call => call.kind === 'speak')
        );

        // Android 不指定 voice，一次播放即可。
        // iPad 的 broken-voice 情境仍須先失敗再備援。
        const expectedAttempts =
          mode === 'broken-voice' && !isAndroid ? 2 : 1;

        assert.equal(
          calls.length,
          expectedAttempts,
          `${kind}/${mode}: unexpected playback attempt count`
        );

        // 保留非 Android 平台的語音失敗備援驗證。
        if (mode === 'broken-voice' && !isAndroid) {
          assert.equal(calls[0].voice, 'en-US');
          assert.equal(calls[1].voice, null);
          assert.equal(calls[1].lang, 'en-US');
          assert.equal(calls[1].text, calls[0].text);
          assert.equal(calls[1].rate, calls[0].rate);
        }

        // 所有平台都必須要求英文。
        assert.equal(calls[0].lang, 'en-US');

        // Android：不指定 voice。
        // iPad：英文清單可用時仍指定英文 voice。
        assert.equal(
          calls[0].voice,
          isAndroid || mode === 'empty' ? null : 'en-US',
          `${kind}/${mode}: incorrect voice selection`
        );

        // Android 即使收到英文清單，也不可強制指定 voice。
        if (isAndroid) {
          assert.equal(
            calls[0].voice,
            null,
            'Android must use system-selected en-US voice'
          );
          assert.equal(
            calls[0].lang,
            'en-US',
            'Android must retain the English locale'
          );
        }

        // 翻面不得重新播放。
        await page
          .getByRole('button', { name: 'Flip', exact: true })
          .click();

        assert.equal(
          await page.evaluate(
            () =>
              window.speechCalls.filter(
                call => call.kind === 'speak'
              ).length
          ),
          expectedAttempts
        );

        await page
          .getByRole('button', { name: 'Flip', exact: true })
          .click();

        // 語速修改及手動重播。
        await page
          .getByRole('button', { name: 'Rate', exact: true })
          .click();

        await replay.click();

        const replayCalls = await page.evaluate(() =>
          window.speechCalls.filter(call => call.kind === 'speak')
        );

        assert.equal(replayCalls.at(-1).rate, 1.2);
        assert.equal(replayCalls.at(-1).lang, 'en-US');

        if (isAndroid) {
          assert.equal(
            replayCalls.at(-1).voice,
            null,
            'Android manual replay must not assign a voice'
          );
        }

        // 切換下一張字卡。
        await page
          .getByRole('button', { name: 'Next', exact: true })
          .click();

        await page.waitForFunction(() =>
          window.speechCalls.some(call => call.text === 'world')
        );

        // 瀏覽器限制播放時必須顯示錯誤。
        await page.evaluate(() => {
          window.speechMode = 'blocked';
        });

        await replay.click();

        await page
          .getByText(
            '瀏覽器限制了語音播放，請手動按「重新播放發音」啟動。'
          )
          .waitFor();

        // 英文語音不可用時必須顯示正確提示。
        await page.evaluate(() => {
          window.speechMode = 'unsupported-language';
        });

        await replay.click();

        await page
          .getByText(
            '語音引擎無法提供英文，請啟用或安裝英文語音後重試。'
          )
          .waitFor();

        // 頁面進入背景時必須取消播放。
        await page.evaluate(() => {
          window.speechMode = 'ready';

          Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: true,
          });

          document.dispatchEvent(
            new Event('visibilitychange')
          );
        });

        assert.equal(
          await page.evaluate(
            () => window.speechCalls.at(-1).kind
          ),
          'cancel'
        );

        await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: false,
          });
        });

        await replay.click();

        // 關閉元件後，voiceschanged 不得重新觸發播放。
        await page
          .getByRole('button', { name: 'Close', exact: true })
          .click();

        const count = await page.evaluate(
          () =>
            window.speechCalls.filter(
              call => call.kind === 'speak'
            ).length
        );

        await page.evaluate(() => {
          window.speechSynthesis.dispatchEvent(
            new Event('voiceschanged')
          );
        });

        await page.waitForTimeout(100);

        assert.equal(
          await page.evaluate(
            () =>
              window.speechCalls.filter(
                call => call.kind === 'speak'
              ).length
          ),
          count
        );

        assert.deepEqual(errors, []);

        await context.close();
      }

      console.log(
        'SPEECH_BROWSER_VERIFIED',
        JSON.stringify({
          browser: kind,
          mockedApi: true,
          mobileEmulation: true,
          androidSystemVoice: isAndroid,
        })
      );
    } finally {
      await browser.close();
      await new Promise(resolve => server.close(resolve));
    }
  }
);
