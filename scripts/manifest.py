"""Hash exact source and review artifacts; omit credentials, caches and intermediates."""
import pathlib, hashlib, json, subprocess
root=pathlib.Path(__file__).resolve().parents[1]
paths=['README.md','RUN.md','SPRINT_REPORT.md','DEMO_RUN_OF_SHOW.md','AUDIO_ROUTING.md','DEMO_DISCLOSURE.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','index.html','.gitignore']
for folder in ['src','server','tests','scripts','docs']:
 paths.extend(str(p.relative_to(root)) for p in (root/folder).rglob('*') if p.is_file() and p.name!='PUBLICATION_PACKET.md' and '__pycache__' not in str(p))
paths.extend(str(p.relative_to(root)) for p in (root/'artifacts').glob('*') if p.is_file() and p.suffix in ['.json','.txt','.srt','.png','.mp4'] and p.name not in ['manifest.json'])
items=[]
for rel in sorted(set(paths)):
 p=root/rel
 if p.exists():items.append({'path':rel,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
try: commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,env={**__import__('os').environ,'DEVELOPER_DIR':'/Library/Developer/CommandLineTools'},text=True).strip()
except: commit='unknown'
(root/'artifacts/manifest.json').write_text(json.dumps({'baseOrCheckpointCommit':commit,'note':'Hashes cover current files. Manifest and publication packet excluded to avoid circular hashes; intermediate audio/screen capture and private .local state excluded.','artifacts':items},indent=2)+'\n')
print(f'{len(items)} artifacts hashed; checkpoint {commit}')
