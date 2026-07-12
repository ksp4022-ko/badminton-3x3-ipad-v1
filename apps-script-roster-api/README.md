# iPad V1 Roster API

Deploy this folder as a new Google Apps Script Web App.

Deployment settings:

- Execute as: Me
- Who has access: Anyone

After deployment, copy the Web App URL into the iPad V1 app when prompted by `抓取報名名單`.

Supported actions:

- `?action=listEvents&site=rian`
- `?action=previewRoster&site=rian&eventId=...`

The iPad app also supports JSONP fallback through the `callback` query parameter.
