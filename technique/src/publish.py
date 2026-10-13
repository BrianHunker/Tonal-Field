"""Copy built pages into technique/ as site pages: the site page's own head (viewport, favicon, theme) over the build.
   Usage: python3 st/build.py && python3 publish.py frame-walk semimodes structures hand-lab chords"""
import sys, os
S=os.path.dirname(os.path.abspath(__file__)); T=os.path.dirname(S)
for n in sys.argv[1:]:
    src=open(os.path.join(S,n+'.html')).read()
    site_path=os.path.join(T,n+'.html')
    head_from=site_path if os.path.exists(site_path) else os.path.join(T,'semimodes.html')
    site=open(head_from).read()
    head=site[:site.index('<title>')]; body=src[src.index('<title>'):]
    body=body.replace('</title>\n','</title>\n<link rel="icon" href="../favicon.ico">\n',1).replace('  --sans:','  color-scheme:light;\n  --sans:',1).replace('\n</style>\n','\n[hidden]{display:none !important}\n</style></head><body>\n',1)
    open(site_path,'w').write(head+body.rstrip('\n')+'\n</body></html>\n')
    print('published',n)
