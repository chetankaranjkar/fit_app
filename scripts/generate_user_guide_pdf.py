"""Generate branded PulseFit User Guide PDFs.

Outputs three PDFs in docs/:
- PulseFit-User-Guide.pdf       (full guide: Admin + Trainer)
- PulseFit-Admin-Guide.pdf      (administrators only)
- PulseFit-Trainer-Guide.pdf    (trainers only)

Each PDF has a branded header (logo + product title + variant) and a
footer (role watermark + page number), plus a professional cover page.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
IMAGES_DIR = DOCS_DIR / "images"

PRIMARY = HexColor("#3b82f6")
ACCENT = HexColor("#a855f7")
BG_DARK = HexColor("#0b1020")
TEXT_DARK = HexColor("#0f172a")
MUTED = HexColor("#64748b")
CARD_BG = HexColor("#f1f5ff")
BORDER = HexColor("#e2e8f0")
HEADER_LINE = HexColor("#c7d2fe")


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------

def build_styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=36,
            leading=42,
            alignment=TA_CENTER,
            textColor=HexColor("#ffffff"),
            spaceAfter=12,
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=20,
            alignment=TA_CENTER,
            textColor=HexColor("#e2e8f0"),
            spaceAfter=6,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            alignment=TA_CENTER,
            textColor=HexColor("#cbd5e1"),
        ),
        "section_eyebrow": ParagraphStyle(
            "section_eyebrow",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=ACCENT,
            spaceAfter=4,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            textColor=PRIMARY,
            spaceBefore=10,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=22,
            textColor=TEXT_DARK,
            spaceBefore=14,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "h3",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=18,
            textColor=HexColor("#1e293b"),
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=16,
            textColor=TEXT_DARK,
            alignment=TA_LEFT,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=16,
            textColor=TEXT_DARK,
            leftIndent=14,
            bulletIndent=4,
            spaceAfter=3,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=12,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
        "callout": ParagraphStyle(
            "callout",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=HexColor("#0b3b8f"),
            backColor=CARD_BG,
            borderColor=PRIMARY,
            borderWidth=0,
            borderPadding=8,
            leftIndent=6,
            rightIndent=6,
            spaceBefore=6,
            spaceAfter=10,
        ),
        "toc_item": ParagraphStyle(
            "toc_item",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=18,
            textColor=TEXT_DARK,
        ),
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def image_flowable(filename: str, max_width_cm: float = 16.0):
    path = IMAGES_DIR / filename
    if not path.exists():
        return Paragraph(
            f"<i>Screenshot missing: {filename}</i>",
            getSampleStyleSheet()["Italic"],
        )
    img = Image(str(path))
    iw = img.imageWidth
    ih = img.imageHeight
    max_w = max_width_cm * cm
    ratio = max_w / iw
    img.drawWidth = max_w
    img.drawHeight = ih * ratio
    img.hAlign = "CENTER"
    return img


def bullet(text: str, styles) -> Paragraph:
    return Paragraph(f"\u2022 &nbsp;{text}", styles["bullet"])


@dataclass
class DocMeta:
    variant: str  # "Full", "Admin", "Trainer"
    output: Path
    include_admin: bool
    include_trainer: bool


# ---------------------------------------------------------------------------
# Header / footer canvas hooks
# ---------------------------------------------------------------------------

def make_page_decorator(meta: DocMeta) -> Callable:
    logo_path = IMAGES_DIR / "pulsefit-logo.png"

    def draw(canvas, doc):
        canvas.saveState()
        width, height = doc.pagesize

        # Skip header on cover page
        if canvas.getPageNumber() > 1:
            # Header band
            if logo_path.exists():
                try:
                    canvas.drawImage(
                        str(logo_path),
                        1.5 * cm,
                        height - 1.6 * cm,
                        width=1.1 * cm,
                        height=1.1 * cm,
                        mask="auto",
                        preserveAspectRatio=True,
                    )
                except Exception:
                    pass

            canvas.setFont("Helvetica-Bold", 11)
            canvas.setFillColor(TEXT_DARK)
            canvas.drawString(3.0 * cm, height - 1.15 * cm, "PulseFit")

            canvas.setFont("Helvetica", 9)
            canvas.setFillColor(MUTED)
            canvas.drawString(
                3.0 * cm,
                height - 1.55 * cm,
                f"Gym Management User Guide  |  {meta.variant} edition",
            )

            canvas.setStrokeColor(HEADER_LINE)
            canvas.setLineWidth(0.6)
            canvas.line(
                1.5 * cm,
                height - 1.75 * cm,
                width - 1.5 * cm,
                height - 1.75 * cm,
            )

        # Footer
        canvas.setStrokeColor(HEADER_LINE)
        canvas.setLineWidth(0.4)
        canvas.line(1.5 * cm, 1.55 * cm, width - 1.5 * cm, 1.55 * cm)

        canvas.setFont("Helvetica", 8.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(
            1.5 * cm,
            1.15 * cm,
            f"PulseFit  |  {meta.variant} edition",
        )
        canvas.drawRightString(
            width - 1.5 * cm,
            1.15 * cm,
            f"Page {canvas.getPageNumber()}",
        )
        canvas.restoreState()

    return draw


# ---------------------------------------------------------------------------
# Content builders
# ---------------------------------------------------------------------------

def cover_page(story: list, styles: dict, meta: DocMeta) -> None:
    title_text = "PulseFit"
    subtitle_lines = [
        "Gym Management Application",
        "User Guide",
    ]
    audience = {
        "Full": "For Administrators and Trainers",
        "Admin": "For Administrators",
        "Trainer": "For Trainers",
    }[meta.variant]

    cover_table = Table(
        [
            [Paragraph(title_text, styles["cover_title"])],
            [Paragraph(subtitle_lines[0], styles["cover_subtitle"])],
            [Paragraph(subtitle_lines[1], styles["cover_subtitle"])],
            [Spacer(1, 1 * cm)],
            [Paragraph(audience, styles["cover_meta"])],
            [Paragraph("Version 1.0", styles["cover_meta"])],
        ],
        colWidths=[16 * cm],
    )
    cover_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BG_DARK),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 22),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 22),
                ("LEFTPADDING", (0, 0), (-1, -1), 28),
                ("RIGHTPADDING", (0, 0), (-1, -1), 28),
                ("ROUNDEDCORNERS", [18, 18, 18, 18]),
            ]
        )
    )
    story.append(Spacer(1, 2.5 * cm))
    story.append(cover_table)
    story.append(Spacer(1, 1.5 * cm))
    story.append(
        Paragraph(
            "A complete start-to-end walkthrough of the PulseFit platform, "
            "organized by user role.",
            styles["caption"],
        )
    )
    story.append(PageBreak())


def toc_page(story: list, styles: dict, meta: DocMeta) -> None:
    story.append(Paragraph("Table of contents", styles["h1"]))

    entries: list[str] = ["1. Getting started"]

    if meta.include_admin:
        entries += [
            "2. Admin Guide",
            "   2.1 Dashboard",
            "   2.2 Member management",
            "   2.3 Membership plans",
            "   2.4 User memberships",
            "   2.5 Payments and invoices",
            "   2.6 Trainer management",
            "   2.7 Roles and permissions",
            "   2.8 Security monitoring",
            "   2.9 Reports and exports",
            "   2.10 Notifications",
            "   2.11 Admin daily checklist",
        ]
    if meta.include_trainer:
        next_num = 3 if meta.include_admin else 2
        entries += [
            f"{next_num}. Trainer Guide",
            f"   {next_num}.1 Trainer dashboard",
            f"   {next_num}.2 Assigned clients",
            f"   {next_num}.3 Body metrics for clients",
            f"   {next_num}.4 Attendance logs",
            f"   {next_num}.5 Workout plans",
            f"   {next_num}.6 Diet plans",
            f"   {next_num}.7 Schedule management",
            f"   {next_num}.8 Trainer daily checklist",
        ]

    tail = len([e for e in entries if e and e[0].isdigit()]) + 1
    entries += [f"{tail}. Troubleshooting", f"{tail + 1}. Support"]

    for e in entries:
        story.append(Paragraph(e, styles["toc_item"]))
    story.append(PageBreak())


def getting_started(story: list, styles: dict) -> None:
    story.append(Paragraph("ONBOARDING", styles["section_eyebrow"]))
    story.append(Paragraph("1. Getting started", styles["h1"]))
    story.append(
        Paragraph(
            "PulseFit is a role-based gym management platform. Administrators manage "
            "the entire business: members, payments, invoices, trainers, roles, and "
            "reports. Trainers focus on their assigned clients: viewing profiles, "
            "logging body metrics, tracking attendance, and maintaining workout and "
            "diet plans.",
            styles["body"],
        )
    )
    story.append(Paragraph("1.1 Logging in", styles["h2"]))
    story.append(bullet("Open the application URL in your browser.", styles))
    story.append(bullet("Enter your <b>Username or email</b> and <b>Password</b>.", styles))
    story.append(bullet("Click <b>Sign in</b>.", styles))
    story.append(bullet("You are routed to your role-specific dashboard.", styles))
    story.append(image_flowable("user-guide-login.png"))
    story.append(Paragraph("Figure 1. PulseFit login screen.", styles["caption"]))
    story.append(
        Paragraph(
            "<b>Tip.</b> If your session expires while working, PulseFit redirects you "
            "back to login and shows a contextual expiry message. Re-sign in to resume.",
            styles["callout"],
        )
    )
    story.append(PageBreak())


def admin_guide(story: list, styles: dict, section_num: int = 2) -> None:
    story.append(Paragraph("ADMIN", styles["section_eyebrow"]))
    story.append(Paragraph(f"{section_num}. Admin Guide", styles["h1"]))
    story.append(
        Paragraph(
            "This section covers every operation an administrator can perform. "
            "Permissions are enforced on both UI and API; if you cannot see a feature, "
            "ask an admin to grant the related permission code.",
            styles["body"],
        )
    )

    # Dashboard
    story.append(Paragraph(f"{section_num}.1 Dashboard overview", styles["h2"]))
    story.append(
        Paragraph(
            "The admin dashboard shows key performance indicators, live charts, "
            "upcoming classes, the notification center, and (for authorized users) a "
            "security monitoring card.",
            styles["body"],
        )
    )
    story.append(bullet("KPI cards: Total members, Active memberships, Monthly revenue, Trainers.", styles))
    story.append(bullet("Memberships-over-time chart for trend analysis.", styles))
    story.append(bullet("Notification center: expiring memberships, failed payments, attendance anomalies.", styles))
    story.append(bullet("Export button to download a monthly report CSV.", styles))
    story.append(image_flowable("user-guide-dashboard.png"))
    story.append(Paragraph("Figure 2. Admin dashboard after login.", styles["caption"]))

    # Members
    story.append(Paragraph(f"{section_num}.2 Member management", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; Users</b>", styles["body"]))
    story.append(Paragraph("<b>Actions available:</b>", styles["h3"]))
    story.append(bullet("Create a new member with contact, emergency, and gym preferences.", styles))
    story.append(bullet("Edit profile, toggle active state, assign user types (e.g. Admin, Trainer, Staff, Member).", styles))
    story.append(bullet("View the member's full profile, memberships, payments, and body metrics.", styles))
    story.append(bullet("Optionally assign a trainer and a membership plan at creation time.", styles))
    story.append(Paragraph("<b>Typical flow:</b>", styles["h3"]))
    story.append(bullet("Click <b>+ Add Member</b> from the dashboard or Users page.", styles))
    story.append(bullet("Fill required fields and set <b>Active</b> state.", styles))
    story.append(bullet("Optionally set a starting membership plan and trainer.", styles))
    story.append(bullet("Save &rarr; member appears in the Users list.", styles))

    # Plans
    story.append(Paragraph(f"{section_num}.3 Membership plans", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; Membership Plans</b>", styles["body"]))
    story.append(bullet("Create plans with a name, duration in days, price (INR), and description.", styles))
    story.append(bullet("Update pricing or duration to reflect offers and renewals.", styles))
    story.append(bullet("Delete plans only when no active memberships reference them.", styles))

    # User memberships
    story.append(Paragraph(f"{section_num}.4 User memberships", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; User Memberships</b>", styles["body"]))
    story.append(bullet("Assign a plan to a user with start date and auto-calculated end date.", styles))
    story.append(bullet("Track status: Active, Expired, Frozen, Cancelled, Pending.", styles))
    story.append(bullet("Freeze or cancel memberships when a member pauses training.", styles))

    # Payments & invoices
    story.append(Paragraph(f"{section_num}.5 Payments and invoices", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; Payments</b>", styles["body"]))
    story.append(
        Paragraph(
            "Each payment automatically generates a paid invoice linked to the "
            "membership. Invoice numbers are produced using a database sequence with "
            "retry on unique conflict, so they remain unique even under concurrent "
            "recording.",
            styles["body"],
        )
    )
    story.append(Paragraph("<b>Record a payment:</b>", styles["h3"]))
    story.append(bullet("Click <b>+ Add payment</b>.", styles))
    story.append(bullet("Select the member's membership &mdash; amount auto-fills from the plan.", styles))
    story.append(bullet("Pick payment date and mode: Cash, UPI, Card.", styles))
    story.append(bullet("Receipt number auto-generates in <b>INV-000000</b> format.", styles))
    story.append(bullet("Save &rarr; paid invoice is created and linked automatically.", styles))
    story.append(Paragraph("<b>View / download invoice:</b>", styles["h3"]))
    story.append(bullet("In the payment row, click <b>Invoice</b>.", styles))
    story.append(bullet("Review line items, totals, and status.", styles))
    story.append(bullet("Click <b>Download PDF</b> to export a professionally designed receipt.", styles))
    story.append(Paragraph("<b>Export payment data:</b>", styles["h3"]))
    story.append(bullet("Select date range in the toolbar.", styles))
    story.append(bullet("Click <b>Export CSV</b> or <b>Export XLS</b>.", styles))
    story.append(image_flowable("user-guide-payments-invoice.png"))
    story.append(Paragraph("Figure 3. Payments page with invoice modal and Download PDF.", styles["caption"]))

    # Trainers
    story.append(Paragraph(f"{section_num}.6 Trainer management", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; Trainers</b>", styles["body"]))
    story.append(bullet("Create trainer profiles with specialization, bio, and hire date.", styles))
    story.append(bullet("Set <b>Max active clients</b> to enforce capacity-aware assignment.", styles))
    story.append(bullet("Assign clients with conflict warnings when schedules overlap.", styles))
    story.append(bullet("View ranked recommendations for trainer-client matches.", styles))

    # Roles
    story.append(Paragraph(f"{section_num}.7 Roles and permissions", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; Roles</b>", styles["body"]))
    story.append(bullet("Create roles and attach permission codes (Reports, Config, Payments, TrainerAccess, etc.).", styles))
    story.append(bullet("Assign roles to users via the Users page.", styles))
    story.append(bullet("Permissions are enforced on both the UI (via PermissionGate) and API.", styles))
    story.append(image_flowable("user-guide-roles.png"))
    story.append(Paragraph("Figure 4. Roles and permissions page.", styles["caption"]))

    # Security
    story.append(Paragraph(f"{section_num}.8 Security monitoring", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; Security</b> (requires the Reports/security permission)", styles["body"]))
    story.append(bullet("See sessions detected as compromised (refresh-token reuse).", styles))
    story.append(bullet("Filter by user email, date range, and severity.", styles))
    story.append(bullet("Copy the current user permission codes for reference.", styles))
    story.append(bullet("Export the list as CSV for audit trails.", styles))
    story.append(image_flowable("user-guide-security.png"))
    story.append(Paragraph("Figure 5. Security page with compromised sessions.", styles["caption"]))

    # Reports
    story.append(Paragraph(f"{section_num}.9 Reports and exports", styles["h2"]))
    story.append(bullet("Revenue trends by date range.", styles))
    story.append(bullet("Plan sales and churn rate.", styles))
    story.append(bullet("Attendance trends across members.", styles))
    story.append(bullet("CSV and XLS formats available from the dashboard and payments pages.", styles))

    # Notifications
    story.append(Paragraph(f"{section_num}.10 Notifications", styles["h2"]))
    story.append(
        Paragraph(
            "The notification center summarizes in-app alerts and webhook status. "
            "Optional email/WhatsApp hooks can be configured in "
            "<i>appsettings.json &rarr; Notifications</i>, with retries and a scheduled "
            "reminder background service.",
            styles["body"],
        )
    )
    story.append(bullet("Memberships expiring soon.", styles))
    story.append(bullet("Failed or missing payments.", styles))
    story.append(bullet("Attendance anomalies such as no-shows or late arrivals.", styles))

    # Daily checklist
    story.append(Paragraph(f"{section_num}.11 Admin daily checklist", styles["h2"]))
    story.append(bullet("Review the notification center for alerts.", styles))
    story.append(bullet("Record the day's payments and verify invoice generation.", styles))
    story.append(bullet("Handle any attendance anomalies and add audit notes for corrections.", styles))
    story.append(bullet("Check security events and revoke suspicious sessions.", styles))
    story.append(bullet("Export an end-of-day payments report.", styles))
    story.append(PageBreak())


def trainer_guide(story: list, styles: dict, section_num: int = 3) -> None:
    story.append(Paragraph("TRAINER", styles["section_eyebrow"]))
    story.append(Paragraph(f"{section_num}. Trainer Guide", styles["h1"]))
    story.append(
        Paragraph(
            "Trainers use PulseFit to manage assigned clients, track physical progress, "
            "maintain workout and diet plans, and keep attendance records accurate.",
            styles["body"],
        )
    )

    story.append(Paragraph(f"{section_num}.1 Trainer dashboard", styles["h2"]))
    story.append(bullet("See the number of clients currently assigned to you.", styles))
    story.append(bullet("View upcoming classes or scheduled sessions.", styles))
    story.append(bullet("Quickly navigate to client profiles via the Users menu.", styles))

    story.append(Paragraph(f"{section_num}.2 Assigned clients", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; Users</b> (filter to your assigned clients)", styles["body"]))
    story.append(bullet("Open any client to see their full profile, body metrics, and memberships.", styles))
    story.append(bullet("Use the client detail tabs: Details, Body Metrics, Graph, In Action.", styles))
    story.append(bullet("Report issues to admin if a client appears in your list without your knowledge.", styles))

    story.append(Paragraph(f"{section_num}.3 Body metrics for clients", styles["h2"]))
    story.append(Paragraph("Path: <b>Users &rarr; [Client] &rarr; Body Metrics</b>", styles["body"]))
    story.append(Paragraph("<b>Log a new reading:</b>", styles["h3"]))
    story.append(bullet("Click <b>+ Log metrics</b> in the Body Metrics tab.", styles))
    story.append(bullet("Enter weight, height, body fat %, muscle mass, and circumferences (chest, waist, hips, biceps, thighs, neck, shoulders, forearms, calves).", styles))
    story.append(bullet("BMI is computed automatically from weight and height.", styles))
    story.append(bullet("Add optional notes such as goals, training focus, or observations.", styles))
    story.append(Paragraph("<b>Update or delete a reading:</b>", styles["h3"]))
    story.append(bullet("Use the <b>Update</b> button on a history row to adjust values.", styles))
    story.append(bullet("Use <b>Delete</b> to remove a row (action is audited).", styles))
    story.append(Paragraph("<b>Analyze progress:</b>", styles["h3"]))
    story.append(bullet("Switch to the <b>Graph</b> tab for progress charts over time.", styles))
    story.append(bullet("Review the comparison card in the Body Metrics tab to see latest-vs-previous deltas.", styles))
    story.append(image_flowable("user-guide-body-metrics.png"))
    story.append(Paragraph("Figure 6. Body Metrics tab on the client profile.", styles["caption"]))

    story.append(Paragraph(f"{section_num}.4 Attendance logs", styles["h2"]))
    story.append(bullet("See check-ins for your clients by date.", styles))
    story.append(bullet("Review late arrivals and no-shows flagged by the system.", styles))
    story.append(bullet("Submit manual corrections with an audit note when needed.", styles))

    story.append(Paragraph(f"{section_num}.5 Workout plans", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; Training &rarr; Workout Plans</b>", styles["body"]))
    story.append(bullet("Create or reuse workout plans tailored to a client's goals.", styles))
    story.append(bullet("Attach exercises and reference body parts for the plan.", styles))
    story.append(bullet("Assign the plan to a client and iterate based on progress.", styles))
    story.append(image_flowable("user-guide-workout-plans.png"))
    story.append(Paragraph("Figure 7. Workout plans catalog and plan detail.", styles["caption"]))

    story.append(Paragraph(f"{section_num}.6 Diet plans", styles["h2"]))
    story.append(Paragraph("Path: <b>Dashboard &rarr; Diet Plans</b>", styles["body"]))
    story.append(bullet("Build diet plans with daily structure and macronutrient goals.", styles))
    story.append(bullet("Assign plans to clients and adjust based on body metrics trends.", styles))
    story.append(image_flowable("user-guide-diet-plans.png"))
    story.append(Paragraph("Figure 8. Diet plans catalog and plan detail.", styles["caption"]))

    story.append(Paragraph(f"{section_num}.7 Schedule management", styles["h2"]))
    story.append(bullet("Review your upcoming sessions and classes.", styles))
    story.append(bullet("Avoid overbooking: the system warns on scheduling conflicts.", styles))
    story.append(bullet("Coordinate with admin if your capacity (max active clients) is reached.", styles))

    story.append(Paragraph(f"{section_num}.8 Trainer daily checklist", styles["h2"]))
    story.append(bullet("Check today's schedule and attendance.", styles))
    story.append(bullet("Log body metrics for scheduled assessments.", styles))
    story.append(bullet("Update workout and diet plans that need revision.", styles))
    story.append(bullet("Flag anomalies (missed sessions, plateauing progress) to admin.", styles))
    story.append(PageBreak())


def troubleshooting(story: list, styles: dict, start_num: int) -> None:
    story.append(Paragraph("SUPPORT", styles["section_eyebrow"]))
    story.append(Paragraph(f"{start_num}. Troubleshooting", styles["h1"]))
    story.append(bullet("<b>Cannot login:</b> verify credentials, check caps lock, confirm the API is online.", styles))
    story.append(bullet("<b>Session keeps expiring:</b> verify system clock sync; contact admin if it persists.", styles))
    story.append(bullet("<b>Invoice not visible for a payment:</b> click <b>Generate</b> on the payment row, then open <b>Invoice</b>.", styles))
    story.append(bullet("<b>Missing menus or pages:</b> your role may lack the required permission. Ask admin.", styles))
    story.append(bullet("<b>Exports not downloading:</b> check your browser's popup/download permissions.", styles))
    story.append(bullet("<b>Images not loading:</b> the uploads folder on the server may have been cleared.", styles))

    story.append(Paragraph(f"{start_num + 1}. Support", styles["h1"]))
    story.append(
        Paragraph(
            "For account changes, role escalation, or data issues, contact your "
            "PulseFit administrator. For technical errors, include the time, the page "
            "URL, and a screenshot so the issue can be reproduced.",
            styles["body"],
        )
    )


# ---------------------------------------------------------------------------
# Builder
# ---------------------------------------------------------------------------

def build_pdf(meta: DocMeta) -> None:
    styles = build_styles()
    story: list = []

    cover_page(story, styles, meta)
    toc_page(story, styles, meta)
    getting_started(story, styles)

    next_num = 2
    if meta.include_admin:
        admin_guide(story, styles, next_num)
        next_num += 1
    if meta.include_trainer:
        trainer_guide(story, styles, next_num)
        next_num += 1

    troubleshooting(story, styles, next_num)

    doc = SimpleDocTemplate(
        str(meta.output),
        pagesize=A4,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2.4 * cm,
        bottomMargin=2.0 * cm,
        title=f"PulseFit {meta.variant} Guide",
        author="PulseFit",
    )
    decorator = make_page_decorator(meta)
    doc.build(story, onFirstPage=decorator, onLaterPages=decorator)
    print(f"Generated: {meta.output}")


def main() -> None:
    os.makedirs(DOCS_DIR, exist_ok=True)
    variants = [
        DocMeta("Full", DOCS_DIR / "PulseFit-User-Guide.pdf", True, True),
        DocMeta("Admin", DOCS_DIR / "PulseFit-Admin-Guide.pdf", True, False),
        DocMeta("Trainer", DOCS_DIR / "PulseFit-Trainer-Guide.pdf", False, True),
    ]
    for v in variants:
        build_pdf(v)


if __name__ == "__main__":
    main()
