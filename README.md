# ace_website

Website for **Achieving Excellence in English with Mrs Aw**, built from the 2026 Digital Catalogue.

## Pages
| URL | Content (catalogue page) |
| --- | --- |
| `/` | Home: cover, overview, HEART preview, fees at a glance, review |
| `/about` | About Mrs Aw + The HEART Method (p.2) |
| `/curriculum` | What Students Learn in Class (p.3) |
| `/fees` | 2026 Fees, Payment, School Holidays (p.4) |
| `/schedule` | 2026 Class Schedule (p.5) |
| `/policies` | Class Policies & Who This Is For (p.6) |
| `/enquire` | How to Enquire, Contact, Parent Reviews, **contact form** (p.7) |

## Run locally
```bash
python3 -m venv .venv            # first time only
source .venv/bin/activate
pip install -r requirements.txt  # first time only
python app.py
```
Then open http://127.0.0.1:8000. Set `PORT=xxxx` to use a different port.

## Editing content
All text (fees, schedule, reviews, policies…) lives in plain Python lists at the top of `app.py`.
Page layouts are in `templates/`, styling in `static/css/style.css`, photos in `static/img/`.

## Contact form
Submissions are validated and saved to `data/enquiries.csv` (open it in Excel or Numbers).
After submitting, the parent can also send the same details to WhatsApp with one click.
`data/` is git-ignored, so enquiries are never committed.
