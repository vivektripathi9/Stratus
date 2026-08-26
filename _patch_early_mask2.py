from pathlib import Path

ROOT = Path(r"c:\Cursor\Dummy_stratus")

OLD = """    <script>
      (function () {
        try {
          if (location.protocol !== \"http:\" && location.protocol !== \"https:\") return;
          if (location.pathname !== \"/\" || location.hash) {
            history.replaceState(null, \"\", \"/\" + (location.search || \"\"));
          }
        } catch (e) {}
      })();
    </script>"""

NEW = """    <script>
      (function () {
        try {
          if (location.protocol !== \"http:\" && location.protocol !== \"https:\") return;
          var path = location.pathname;
          if (path !== \"/\" || location.hash) {
            try {
              sessionStorage.setItem(\"stratus-landed-path\", path);
            } catch (err) {}
            history.replaceState(null, \"\", \"/\" + (location.search || \"\"));
          }
        } catch (e) {}
      })();
    </script>"""

for html in ROOT.glob("*.html"):
    text = html.read_text(encoding="utf-8")
    if OLD not in text:
        print("missing", html.name)
        continue
    html.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")
    print("updated", html.name)
