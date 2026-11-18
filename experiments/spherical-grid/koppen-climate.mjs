// Thresholds: Beck et al. 2023, Scientific Data 10:724, Table 1 (CC BY 4.0).
// https://doi.org/10.1038/s41597-023-02549-6 ; independent implementation.
export const KOPPEN_CODES=['Ocean','Af','Am','Aw','BWh','BWk','BSh','BSk','Csa','Csb','Csc','Cwa','Cwb','Cwc','Cfa','Cfb','Cfc','Dsa','Dsb','Dsc','Dsd','Dwa','Dwb','Dwc','Dwd','Dfa','Dfb','Dfc','Dfd','ET','EF'];
export function classifyKoppen(temperature,precipitation){
 if(temperature.length!==12||precipitation.length!==12||!Array.from(temperature).every(Number.isFinite)||!Array.from(precipitation).every(x=>Number.isFinite(x)&&x>=0))throw RangeError('Expected 12 months in Celsius and mm/month');
 const t=Array.from(temperature),p=Array.from(precipitation),mean=t.reduce((s,x)=>s+x,0)/12,annual=p.reduce((s,x)=>s+x,0),cold=Math.min(...t),hot=Math.max(...t),mon10=t.filter(x=>x>10).length;
 // Summer is the warmer of Apr-Sep / Oct-Mar, including lagged ocean seasons.
 const a=[3,4,5,6,7,8],b=[9,10,11,0,1,2],summer=a.reduce((s,i)=>s+t[i],0)>=b.reduce((s,i)=>s+t[i],0)?a:b,winter=summer===a?b:a;
 const sp=summer.map(i=>p[i]),wp=winter.map(i=>p[i]),sf=annual?sp.reduce((s,x)=>s+x,0)/annual:.5;
 const threshold=20*mean+(sf>.7?280:sf<.3?0:140);
 if(annual<threshold)return (annual<threshold/2?'BW':'BS')+(mean>=18?'h':'k');
 if(cold>=18)return Math.min(...p)>=60?'Af':Math.min(...p)>=100-annual/25?'Am':'Aw';
 if(hot<=10)return hot>0?'ET':'EF';
 const group=cold>0?'C':'D';
 const season=Math.min(...sp)<40&&Math.min(...sp)<Math.max(...wp)/3?'s':Math.min(...wp)<Math.max(...sp)/10?'w':'f';
 const heat=hot>=22?'a':mon10>=4?'b':group==='D'&&cold< -38?'d':'c';
 return group+season+heat;
}
