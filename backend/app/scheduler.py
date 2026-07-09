"""APScheduler wiring for background workflow jobs."""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.workflow import jobs

_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        jobs.job_check_pre_enroll_unpaid,
        CronTrigger(hour=8, minute=0),
        id="pre_enroll_unpaid",
        replace_existing=True,
    )
    scheduler.add_job(
        jobs.job_check_installment_overdue,
        CronTrigger(hour=9, minute=0),
        id="installment_overdue",
        replace_existing=True,
    )
    scheduler.add_job(
        jobs.job_check_dormant_followup,
        CronTrigger(hour=10, minute=0),
        id="dormant_followup",
        replace_existing=True,
    )
    scheduler.add_job(
        jobs.job_class_start_reminder,
        CronTrigger(hour=7, minute=0),
        id="class_start_reminder",
        replace_existing=True,
    )
    scheduler.add_job(
        jobs.job_archive_inactive_journeys,
        CronTrigger(day_of_week="sun", hour=0, minute=0),
        id="archive_inactive_journeys",
        replace_existing=True,
    )
    scheduler.start()
    _scheduler = scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
