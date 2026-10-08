"""Achieving Excellence in English with Mrs Aw — website.

Run locally:
    source .venv/bin/activate
    python app.py
"""
import csv
import os
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from flask import Flask, flash, redirect, render_template, request, url_for

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-me")

ENQUIRIES_FILE = Path(__file__).parent / "data" / "enquiries.csv"
ENQUIRY_FIELDS = ["submitted_at", "parent_name", "phone", "email", "child_level",
                  "concern", "preferred_timing", "lesson_type", "mode", "message"]

BUSINESS = {
    "brand": "Achieving Excellence with Mrs Aw",
    "tagline": "Winning Hearts, Building Excellence.",
    "registered_name": "Achieving Excellence Education",
    "uen": "53527485L",
    "instagram": "Mrsawqiqi",
    "whatsapp": "9222 1021",
    "whatsapp_link": "https://wa.me/6592221021",
}

NAV = [
    ("home", "Home"),
    ("about", "About Mrs Aw"),
    ("curriculum", "What Students Learn"),
    ("fees", "Fees"),
    ("schedule", "Class Schedule"),
    ("policies", "Policies"),
    ("enquire", "Enquire"),
]

HEART = [
    ("H", "Honour", "the child", "heart-handshake",
     "We start with where the child is, not where we assume they should be."),
    ("E", "Equip", "with skills", "wrench",
     "Clear, practical frameworks for every skill that feels confusing."),
    ("A", "Anchor", "in fundamentals", "anchor",
     "Grammar and vocabulary taught as building blocks, not drills."),
    ("R", "Refine", "through feedback", "message-circle-more",
     "In-the-moment feedback so students know how to improve, now."),
    ("T", "Teach", "toward mastery", "flag",
     "Every lesson connects to the bigger PSLE or Secondary journey."),
]

LEVELS = [
    {"name": "Primary 1–2", "subtitle": "Building a Strong Foundation", "icon": "sprout",
     "duration": "1.5 hr", "fee": 60,
     "topics": ["Basic grammar foundations",
                "Reading stories to cultivate interest in language",
                "Vocabulary building and usage",
                "Writing simple compositions"]},
    {"name": "Primary 3–4", "subtitle": "Strengthening Core Skills", "icon": "pencil-ruler",
     "duration": "2 hr", "fee": 80,
     "topics": ["More grammar rules, including present perfect and past perfect tense",
                "Stronger framework for composition writing",
                "Vocabulary development",
                "Comprehension skills",
                "Synthesis & Transformation"]},
    {"name": "Primary 5–6", "subtitle": "Preparing for PSLE", "icon": "trophy",
     "duration": "2 hr", "fee": 90,
     "topics": ["Oral practice using clear frameworks",
                "Paper 1: Situational Writing",
                "Paper 1: Composition Writing",
                "Strengthening writing techniques and rising action development",
                "Paper 2 components"]},
    {"name": "Secondary 1–2", "subtitle": "Building Thinking, Writing and Oracy Skills",
     "icon": "lightbulb", "duration": "2 hr", "fee": 100,
     "topics": ["Current affairs and theme-based learning",
                "Presentations to build oracy and research skills",
                "Preparation for expository and argumentative essays",
                "Understanding literary devices",
                "Comprehension answering techniques",
                "Paraphrasing for summary writing"]},
    {"name": "Secondary 3–4", "subtitle": "Preparing for O-Levels", "icon": "mountain",
     "duration": "2 hr", "fee": 100,
     "topics": ["Builds on the Secondary 1–2 curriculum",
                "Stronger essay writing for O-Level demands",
                "Sharper comprehension and summary writing skills",
                "Continued practice in oral communication",
                "Exam-focused preparation for O-Level English"]},
]

FEES = [
    ("Primary 1–2", "Building a Strong Foundation", "sprout", "1.5 hr", 60),
    ("Primary 3–4", "Strengthening Core Skills", "pencil-ruler", "2 hr", 80),
    ("Primary 5–6", "Preparing for PSLE", "trophy", "2 hr", 90),
    ("Secondary 1–4", "Building Thinking, Writing and Oracy Skills", "lightbulb", "2 hr", 100),
]

SCHEDULE = [
    ("Primary 1", "sprout", "Starting 18 Sept", [("Friday", "3:00 – 4:30 pm")]),
    ("Primary 2", "book-open", None, [("Saturday", "1:00 – 2:30 pm")]),
    ("Primary 3", "pencil-ruler", None, [("Monday", "3:00 – 5:00 pm"), ("Thursday", "5:00 – 7:00 pm")]),
    ("Primary 4", "trophy", None, [("Monday", "5:00 – 7:00 pm"), ("Tuesday", "7:00 – 9:00 pm")]),
    ("Primary 5", "notebook-pen", None, [("Friday", "5:00 – 7:00 pm"), ("Saturday", "9:00 – 11:00 am")]),
    ("Primary 6", "graduation-cap", None, [("Tuesday", "5:00 – 7:00 pm"), ("Thursday", "7:00 – 9:00 pm")]),
    ("Secondary 1", "star", None, [("Saturday", "11:00 am – 1:00 pm")]),
    ("Secondary 2", "lightbulb", None, [("Monday", "7:30 – 9:30 pm")]),
]

ATTENDANCE = [
    ("Reserved Slot", "calendar-check",
     "Each child's slot is reserved in advance, so missed lessons are generally not refundable."),
    ("Inform Early", "message-circle-more",
     "Please let Mrs Aw know as early as possible if your child cannot attend."),
    ("Support Options", "monitor-play",
     "A replacement class, recording or materials may be provided where possible."),
    ("Teacher Cancellation", "user-check",
     "If Mrs Aw cancels a lesson, a replacement, credit or fee adjustment will be arranged."),
]

SUITABLE_FOR = [
    ("Expressing ideas clearly in writing", "pen-line",
     "Organising their thoughts and writing compositions or essays with structure, purpose and impact."),
    ("Strengthening language skills", "book-open",
     "Improving grammar, vocabulary, sentence structure and Paper 2 accuracy."),
    ("Communicating with confidence", "message-square-more",
     "Giving clearer oral responses and comprehension answers that are relevant and well-supported."),
    ("Thinking critically", "target",
     "Analysing texts, understanding themes, and responding with insight for comprehension and essays."),
    ("Excelling in exams", "graduation-cap",
     "Applying effective strategies to perform well in PSLE, O-Level and beyond."),
    ("Building confidence & independence", "user-round-check",
     "Helping students who feel unsure, confused or overwhelmed by English to become confident, capable learners."),
]

REVIEWS = [
    ("Sherrine", "S",
     "Mrs Aw is an exceptional teacher. My son joined her during his PSLE year, and we saw a "
     "tremendous improvement in his grades. We are very grateful to have found her at such a crucial "
     "time. My younger child is now also under her guidance. Mrs Aw is passionate, dedicated, and "
     "well-loved by the children, making learning both effective and enjoyable."),
    ("Hui Fang", "H",
     "Our son is truly blessed to have Mrs Aw as his English tutor since Primary 1. From the very "
     "beginning, she made learning English both enjoyable and engaging, while maintaining a "
     "professional and well-structured approach. Under her guidance, our son has grown tremendously in "
     "confidence, reading, and writing, and was awarded Level Best in English Language in Primary 4 "
     "and 5. Beyond academics, Mrs Aw nurtures a positive attitude towards learning and inspires her "
     "students to believe in themselves. Highly recommend her to any parent looking for an exceptional "
     "English tutor. Thank you Mrs Aw!! ❤️"),
    ("Jolene Chua", "J",
     "Absolutely outstanding and highly recommended. We've been with Mrs Aw since P1, and kid is now in "
     "S1 (2025). She's dedicated, upholds high standards, and her class schedule is highly reliable, "
     "with very few cancellations. She is also flexible with make-up lessons when needed. Lessons are "
     "always fun and effective. She genuinely cares for the kids' emotions and takes time to talk to "
     "them. Strict when necessary and consistently delivers excellent results."),
]

LEVEL_OPTIONS = ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
                 "Secondary 1", "Secondary 2", "Secondary 3", "Secondary 4"]


@app.context_processor
def inject_globals():
    return {"biz": BUSINESS, "nav": NAV, "year": datetime.now().year}


@app.route("/")
def home():
    return render_template("home.html", page="home", levels=LEVELS, heart=HEART,
                           review=REVIEWS[0])


@app.route("/about")
def about():
    return render_template("about.html", page="about", heart=HEART)


@app.route("/curriculum")
def curriculum():
    return render_template("curriculum.html", page="curriculum", levels=LEVELS)


@app.route("/fees")
def fees():
    return render_template("fees.html", page="fees", fees=FEES)


@app.route("/schedule")
def schedule():
    return render_template("schedule.html", page="schedule", schedule=SCHEDULE)


@app.route("/policies")
def policies():
    return render_template("policies.html", page="policies", attendance=ATTENDANCE,
                           suitable=SUITABLE_FOR)


def _validate(form):
    data = {k: (form.get(k) or "").strip() for k in ENQUIRY_FIELDS[1:]}
    errors = {}
    if not data["parent_name"]:
        errors["parent_name"] = "Please tell us your name."
    if not re.fullmatch(r"\+?[\d\s-]{8,15}", data["phone"]):
        errors["phone"] = "Please enter a valid phone / WhatsApp number."
    if data["email"] and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", data["email"]):
        errors["email"] = "Please enter a valid email address."
    if data["child_level"] not in LEVEL_OPTIONS:
        errors["child_level"] = "Please choose your child's level in 2026."
    if not data["concern"]:
        errors["concern"] = "Please share your child's current English concern."
    return data, errors


def _whatsapp_text(d):
    lines = [f"Hi Mrs Aw, I'm {d['parent_name']}. I'd like to enquire about English classes.",
             f"Child's level in 2026: {d['child_level']}",
             f"Current English concern: {d['concern']}"]
    if d["preferred_timing"]:
        lines.append(f"Preferred class timing: {d['preferred_timing']}")
    if d["lesson_type"]:
        lines.append(f"Looking for: {d['lesson_type']}")
    if d["mode"]:
        lines.append(f"Preferred mode: {d['mode']}")
    if d["message"]:
        lines.append(f"Message: {d['message']}")
    return quote("\n".join(lines))


@app.route("/enquire", methods=["GET", "POST"])
def enquire():
    data, errors = {}, {}
    if request.method == "POST":
        if request.form.get("website"):  # honeypot field: bots fill it, people never see it
            return redirect(url_for("enquire"))
        data, errors = _validate(request.form)
        if not errors:
            try:
                ENQUIRIES_FILE.parent.mkdir(exist_ok=True)
                is_new = not ENQUIRIES_FILE.exists()
                with ENQUIRIES_FILE.open("a", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=ENQUIRY_FIELDS)
                    if is_new:
                        writer.writeheader()
                    writer.writerow({"submitted_at": datetime.now().isoformat(timespec="seconds"), **data})
            except OSError:  # read-only hosts like Vercel: skip saving, the WhatsApp hand-off still works
                app.logger.warning("Could not save enquiry to %s", ENQUIRIES_FILE)
            flash(data["parent_name"], "success")
            return redirect(url_for("enquire", wa=_whatsapp_text(data)) + "#contact-form")
    return render_template("enquire.html", page="enquire", reviews=REVIEWS, levels=LEVEL_OPTIONS,
                           form=data, errors=errors, wa_text=request.args.get("wa"))


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 8000)), debug=True)
