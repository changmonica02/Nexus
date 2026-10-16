import type { CharacterProfileData, CharacterSection } from "../lib/types";
function Sections({ items }: { items: CharacterSection[] }) {
  return (
    <ul className="space-y-2 border-l pl-3">
      {items.map((s) => (
        <li key={s.id}>
          <span>
            {s.title} <small className="opacity-60">{s.type}</small>
          </span>
          {s.contents && <Sections items={s.contents} />}
        </li>
      ))}
    </ul>
  );
}
export default function TemplateStructurePreview({
  data,
}: {
  data: CharacterProfileData;
}) {
  return (
    <div className="space-y-3">
      <Sections items={data.sections} />
      {data.tabs?.map((t) => (
        <section key={t.id}>
          <h3>{t.title}</h3>
          <Sections items={t.sections} />
        </section>
      ))}
    </div>
  );
}
