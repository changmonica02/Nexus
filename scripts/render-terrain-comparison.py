"""Render actual generated terrain data, not a browser screenshot.
Usage: python scripts/render-terrain-comparison.py before.json after.json output.png
"""
import json, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.path import Path
from matplotlib.collections import LineCollection
from matplotlib.colors import ListedColormap
from scipy.spatial import cKDTree
from matplotlib.font_manager import FontProperties
plt.rcParams['font.family']=FontProperties(fname='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc').get_name()
palette=['#17364e','#20506b','#2b6b86','#418fa6','#76b6c6','#b3d6d4','#8eb57a','#b4bf85','#bba776','#9e876c','#d1c6b5','#eeeae2']
worlds=[json.load(open(p)) for p in sys.argv[1:3]]
fig,axs=plt.subplots(3,2,figsize=(16,13),facecolor='#f3f1eb')
views=[(-180,180,-90,90),(-35,65,-60,-10),(-10,10,-45,-35)]
for col,data in enumerate(worlds):
 tree=cKDTree(data['points']); heights=np.array(data['heights'])
 for row,(x0,x1,y0,y1) in enumerate(views):
  ax=axs[row,col]; nx=1000; ny=500
  xx,yy=np.meshgrid(np.linspace(x0,x1,nx),np.linspace(y0,y1,ny)); lon,lat=np.radians(xx),np.radians(yy)
  xyz=np.stack([np.cos(lat)*np.cos(lon),np.cos(lat)*np.sin(lon),np.sin(lat)],axis=-1)
  h=heights[tree.query(xyz.reshape(-1,3))[1]].reshape(ny,nx)
  bands=np.where(h<0,np.digitize(h,[-65,-45,-25,-10,-3]),6+(np.digitize(h,[2,5,10,20,40]) if col else np.minimum(5,np.floor(np.maximum(h,0)/17)).astype(int)))
  surface=data.get('surface')
  if surface:
   xy=np.column_stack([xx.ravel(),yy.ravel()]); mask=np.zeros(len(xy),dtype=bool)
   for ring in surface['land']:
    r=np.array(ring)
    for shift in [-360,0,360]:
     s=r+np.array([shift,0]); lo=s.min(0); hi=s.max(0)
     take=(xy[:,0]>=lo[0])&(xy[:,0]<=hi[0])&(xy[:,1]>=lo[1])&(xy[:,1]<=hi[1])
     if take.any(): mask[take]^=Path(s).contains_points(xy[take])
   if surface['inverse']:mask=~mask
   mask=mask.reshape(ny,nx); bands=np.where(mask,np.maximum(bands,6),np.minimum(bands,5))
  ax.imshow(bands,extent=(x0,x1,y0,y1),origin='lower',cmap=ListedColormap(palette),vmin=0,vmax=11,interpolation='nearest')
  lines=[];widths=[]
  for river in data['rivers']:
   if row==0 and col and not (river.get('streamOrder',2)>=2 or river['catchmentAreaKm2']>=150000 or river['lengthKm']>=600): continue
   segments=(pair for line in river['lines'] for pair in zip(line,line[1:]))
   for a,b in segments:
    a=np.array(a);b=np.array(b);b[0]=a[0]+(b[0]-a[0]+180)%360-180
    for shift in [-360,0,360]:
     line=np.array([a,b])+[shift,0]
     if line[:,0].max()>=x0 and line[:,0].min()<=x1 and line[:,1].max()>=y0 and line[:,1].min()<=y1:lines.append(line)
  ax.add_collection(LineCollection(lines,colors='#2c6e9a',linewidths=.48 if row==0 else .8,zorder=3))
  coasts=[]
  for ring in data.get('coast',[]):
   for a,b in zip(ring,ring[1:]):
    if abs(a[0]-b[0])>180:continue
    for shift in [-360,0,360]:coasts.append(np.array([a,b])+[shift,0])
  ax.add_collection(LineCollection(coasts,colors='#455b49',linewidths=.35,zorder=4))
  if row==2:
   points=np.array(data['points']);p=np.column_stack([np.degrees(np.arctan2(points[:,1],points[:,0])),np.degrees(np.arcsin(points[:,2]))]);take=(p[:,0]>x0)&(p[:,0]<x1)&(p[:,1]>y0)&(p[:,1]<y1)
   ax.scatter(*p[take].T,s=6,color='#563c35',alpha=.65,zorder=5)
  ax.set(xlim=(x0,x1),ylim=(y0,y1),aspect='equal');ax.tick_params(labelsize=8)
  ax.set_title(('修改前' if col==0 else '修改後')+'｜'+['全球與主要河網','同區域海岸與河流','取樣點與局部河道'][row],fontsize=13)
fig.suptitle('Nexus 地形基礎改良：相同種子 42、陸地目標 32%、大陸核心 8',fontsize=18,y=.985)
fig.text(.5,.015,'由實際生成資料繪製，非瀏覽器截圖。兩版均為 36,002 格；右圖採新高度色帶與全球河網顯示規則。圓點為基礎網格取樣點。',ha='center',fontsize=10)
fig.tight_layout(rect=[0,.035,1,.96]);fig.savefig(sys.argv[3],dpi=150);plt.close(fig)
