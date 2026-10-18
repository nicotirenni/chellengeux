import subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont
W,H=1920,1080
SRC='/home/user/chellengeux/gifs/'
SHOTS=[  # archivo, inicio, duración, título, bajada
 ('01-eliminar-tarea-deshacer',2.6,4.8,'Eliminar con deshacer','Deslizás, eliminás y tenés\n5 segundos para arrepentirte.'),
 ('03-eliminar-evento',6.4,3.6,'Eliminar evento','Resumen antes de confirmar.\nLe avisamos al equipo.'),
 ('07-crear-evento-2-pasos',6.6,4.0,'Crear evento en 2 pasos','Buscás colaboradores\ny el evento queda listo.'),
]
PH=940; PW=round(PH*780/1688); BZ=14; R=56
PX,PY=380,(H-PH-2*BZ)//2
F='/usr/share/fonts/opentype/inter/'
def grad():
    a,b=(0xE9,0xE2,0xFA),(0xC9,0xBC,0xEC)
    g=Image.new('RGB',(W,H)); px=g.load()
    for y in range(H):
        for x in range(0,W,4):
            t=(x/W*0.6+y/H*0.4); c=tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))
            for k in range(4): px[x+k,y]=c
    return g
base=grad()
for i,(n,ss,d,title,sub) in enumerate(SHOTS):
    im=base.copy()
    sh=Image.new('L',(W,H),0); ImageDraw.Draw(sh).rounded_rectangle((PX+10,PY+40,PX+PW+2*BZ+10,PY+PH+2*BZ+40),R+BZ,fill=120)
    sh=sh.filter(ImageFilter.GaussianBlur(40)); im.paste((40,20,80),(0,0),sh)
    dr=ImageDraw.Draw(im)
    dr.rounded_rectangle((PX,PY,PX+PW+2*BZ,PY+PH+2*BZ),R+BZ,fill=(17,17,19))
    tx=PX+PW+2*BZ+150
    dr.text((tx,330),'PROTOTIPO · EVENTOS',font=ImageFont.truetype(F+'Inter-Bold.otf',22),fill=(90,30,158))
    dr.text((tx,372),title,font=ImageFont.truetype(F+'InterDisplay-Bold.otf',64),fill=(26,23,32))
    dr.multiline_text((tx,470),sub,font=ImageFont.truetype(F+'Inter-Regular.otf',34),fill=(70,64,84),spacing=14)
    for j in range(3): dr.rounded_rectangle((tx+j*44,640,tx+j*44+32,646),3,fill=(90,30,158) if j==i else (180,168,214))
    im.save(f'bg{i}.png')
m=Image.new('L',(PW,PH),0); ImageDraw.Draw(m).rounded_rectangle((0,0,PW-1,PH-1),R,fill=255); m.save('mask.png')
# focos del acercamiento (fracción del cuadro): siempre sobre el teléfono
fx=(PX+BZ+PW/2)/W
for i,(n,ss,d,*_) in enumerate(SHOTS):
    N=round(d*30); z0,z1=(1.0,1.08) if i%2==0 else (1.08,1.0)
    fy=[0.55,0.62,0.45][i]
    vf=(f"[1:v]trim=start={ss}:duration={d},setpts=PTS-STARTPTS,fps=30,scale={PW}:{PH}:flags=lanczos,format=rgba[c];"
        f"[2:v]format=gray,loop=-1:size=1[m];[c][m]alphamerge[cm];"
        f"[0:v][cm]overlay={PX+BZ}:{PY+BZ}:shortest=1,scale=3840:2160:flags=lanczos,"
        f"zoompan=z='{z0}+({z1}-{z0})*on/{N}':x='({fx}*iw)-(iw/zoom/2)':y='({fy}*ih)-(ih/zoom/2)':d=1:s=1920x1080:fps=30,format=yuv420p[v]")
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','30','-loop','1','-t',str(d),'-i',f'bg{i}.png','-i',SRC+n+'.mp4','-i','mask.png',
        '-filter_complex',vf,'-map','[v]','-frames:v',str(N),'-c:v','libx264','-crf','16','-preset','medium',f'shot{i}.mp4'],check=True)
X=0.45
durs=[s[2] for s in SHOTS]; o1=durs[0]-X; o2=o1+durs[1]-X; total=o2+durs[2]
music='/root/.claude/skills/cap-demo/assets/music/lofi-smooth-pulsebox.mp3'
subprocess.run(['ffmpeg','-y','-loglevel','error','-i','shot0.mp4','-i','shot1.mp4','-i','shot2.mp4','-i',music,'-filter_complex',
  f"[0:v][1:v]xfade=transition=fade:duration={X}:offset={o1}[a];[a][2:v]xfade=transition=fade:duration={X}:offset={o2},format=yuv420p[v];"
  f"[3:a]atrim=0:{total},afade=t=in:d=0.6,afade=t=out:st={total-1.4}:d=1.4,volume=0.8[au]",
  '-map','[v]','-map','[au]','-c:v','libx264','-crf','18','-preset','slow','-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest',
  '/home/user/chellengeux/gifs/00-demo-cinematico.mp4'],check=True)
print('total',round(total,2))
