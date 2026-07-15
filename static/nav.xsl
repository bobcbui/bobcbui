<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" doctype-system="about:legacy-compat" />

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title><xsl:value-of select="/navigation/site/@name" /></title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #fafafa; color: #111827; line-height: 1.6;
            display: flex; flex-direction: column; min-height: 100vh;
          }
          .header {
            text-align: center; padding: 48px 24px 32px;
            background: #fff; border-bottom: 1px solid #e5e7eb;
          }
          .header h1 { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.025em; }
          .header p { color: #4b5563; font-size: 1.1rem; margin-top: 8px; }
          .grid {
            max-width: 1200px; margin: 40px auto; padding: 0 24px;
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px; flex: 1;
          }
          .card {
            background: #fff; border: 1px solid #e5e7eb; border-radius: 20px;
            padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            transition: border-color 0.2s;
          }
          .card:hover { border-color: rgba(59,130,246,0.5); }
          .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
          .card-emoji { font-size: 1.5rem; }
          .card-title { font-size: 1.15rem; font-weight: 700; }
          .card-desc { color: #4b5563; font-size: 0.95rem; margin-bottom: 16px; }
          .card-links { display: flex; flex-wrap: wrap; gap: 8px; }
          .card-links a {
            display: inline-flex; align-items: center;
            padding: 8px 16px; background: #fafafa; color: #111827;
            border-radius: 10px; text-decoration: none; font-size: 0.9rem;
            font-weight: 500; border: 1px solid #e5e7eb;
            transition: all 0.2s;
          }
          .card-links a:hover {
            background: #fff; color: #3b82f6; border-color: #3b82f6;
            transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.06);
          }
          .footer {
            text-align: center; padding: 32px; color: #4b5563;
            font-size: 0.9rem; border-top: 1px solid #e5e7eb;
            background: #fff; margin-top: 40px;
          }
          @media (max-width: 640px) {
            .header { padding: 32px 16px 24px; }
            .grid { grid-template-columns: 1fr; padding: 0 16px; gap: 16px; }
            .card { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1><xsl:value-of select="/navigation/site/@name" /></h1>
          <p><xsl:value-of select="/navigation/site/@description" /></p>
        </div>

        <div class="grid">
          <xsl:for-each select="/navigation/group">
            <div class="card">
              <div class="card-header">
                <span class="card-emoji"><xsl:value-of select="@emoji" /></span>
                <h2 class="card-title"><xsl:value-of select="@name" /></h2>
              </div>
              <p class="card-desc"><xsl:value-of select="@desc" /></p>
              <div class="card-links">
                <xsl:for-each select="item">
                  <a href="{@href}"><xsl:value-of select="." /></a>
                </xsl:for-each>
              </div>
            </div>
          </xsl:for-each>
        </div>

        <div class="footer">
          <xsl:value-of select="/navigation/site/@name" /> &copy; 2026
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
