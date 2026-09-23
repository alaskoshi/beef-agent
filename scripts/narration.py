"""Offline, original fictional rehearsal soundtrack; no voice cloning or network."""
import json, subprocess, wave, math, struct, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
beats=[
(0, 'Daniel', 'Host', "Where's the beef? Jules and Rowan shipped a project together. One name didn't make the credits. Bring your beef. Bring your corner."),
(16,'Samantha','Jules',"You shipped our shared project without crediting me. You clearly think I did nothing."),
(33,'Daniel','Rowan',"I never said you did nothing. The demo moved to ten. I shipped before the credit slide was ready."),
(47,'Daniel','Host',"That's the first exchange. Take your corner."),
(57,'Samantha','Trainer explanation',"The corner is inspecting the actual excerpt and the selected fictional receipts. This is a fresh model response from Bedrock. The opponent's words stay pinned to the source."),
(69,'Samantha','Jules',"I was treating a missing credit as proof of what you thought about me. The receipt shows the changed timing. I'll ask for the correction directly."),
(83,'Samantha','Jules',"I accept the demo moved. R two explains the timing, but R three still leaves my name out. Can we correct the credit today?"),
(106,'Daniel','Rowan',"Yes. Your design work belongs in the credits. I will add it today. We still need a shared sign-off rule."),
(124,'Daniel','Host',"A concession counts. Now show them you heard it. Their strongest point, in your words."),
(135,'Samantha','Jules',"You were meeting a changed deadline, not saying my work had no value."),
(146,'Daniel','Rowan',"Your grievance is missing public credit, not that I shipped quickly."),
(158,'Daniel','Host',"Credit gets corrected today. The release sign-off rule is still unresolved. That's split beef. No winner needed. A clearer disagreement is progress."),
(174,'Samantha','Disclosure',"Fictional rehearsal. Synthetic voices. Live model coaching. X unverified.")]
rate=24000; total=180; mix=[0.0]*(rate*total); captions=[]
def stamp(t):
 ms=int(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
for i,(start,voice,role,text) in enumerate(beats):
 aiff=root/f'artifacts/audio/{i:02}.aiff';wav=root/f'artifacts/audio/{i:02}.wav'
 subprocess.run(['say','-v',voice,'-r','173','-o',str(aiff),text],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(aiff),'-ar',str(rate),'-ac','1','-c:a','pcm_s16le',str(wav)],check=True)
 with wave.open(str(wav),'rb') as f: samples=struct.unpack('<'+'h'*f.getnframes(),f.readframes(f.getnframes()))
 if len(samples)<rate//4:raise RuntimeError(f'Empty or truncated speech at {i}')
 for j,v in enumerate(samples):
  k=int(start*rate)+j
  if k<len(mix):mix[k]+=v/32768*.75
 duration=len(samples)/rate
 if i<len(beats)-1 and start+duration>beats[i+1][0]:raise RuntimeError(f'Overlapping dialogue at {i}')
 if start+duration>total:raise RuntimeError('Ending exceeds 180 seconds')
 words=text.split();chunks=[];chunk=[]
 for word in words:
  if len(' '.join(chunk+[word]))>76:chunks.append(' '.join(chunk));chunk=[]
  chunk.append(word)
 if chunk:chunks.append(' '.join(chunk))
 for n,chunk in enumerate(chunks):captions.append((start+duration*n/len(chunks),start+duration*(n+1)/len(chunks),f'{role}: {chunk}'))
# Match the app's original restrained palette; intentionally placed between lines.
for start,notes in [(12,[98,147,196]),(13.5,[123,164,246]),(15,[880,1320]),(50,[330,220]),(81,[880,1320]),(121,[196,247]),(155,[196,247,294])]:
 for j,freq in enumerate(notes):
  for k in range(int(.5*rate)):
   t=k/rate;env=min(1,t/.015)*math.exp(-t*14);idx=int((start+j*.12)*rate)+k
   if idx<len(mix):mix[idx]+=.045*env*math.sin(2*math.pi*freq*t)
peak=max(abs(x) for x in mix);scale=min(1,.89/peak)
with wave.open(str(root/'artifacts/narration.wav'),'wb') as out:
 out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);out.writeframes(struct.pack('<'+'h'*len(mix),*(round(x*scale*32767) for x in mix)))
with open(root/'artifacts/demo.srt','w') as f:
 for n,(start,end,text) in enumerate(captions,1):f.write(f'{n}\n{stamp(start)} --> {stamp(end)}\n{text}\n\n')
(root/'artifacts/audio-receipt.json').write_text(json.dumps({'durationSeconds':total,'sampleRate':rate,'peakBeforeScale':peak,'scale':scale,'syntheticVoices':['Samantha','Daniel'],'music':'none','beats':beats},indent=2))
print('Offline soundtrack and captions ready:',total,'seconds; peak',peak*scale)
