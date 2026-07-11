import * as React from "react";

import styles from "./Body.module.css";

export type BodyProps = {
  genderTitle: string;
  fullName: string;
  courseTitle: string;
  courseTitleEn?: string;
  endDate: string;
  durationLabel: string;
};

function OrnamentRule() {
  return (
    <div className={styles.rule} aria-hidden>
      <span className={styles.ruleLine} />
      <span className={styles.ruleDot} />
      <span className={styles.ruleLine} />
    </div>
  );
}

/** The certificate's main statement — student name is the largest element
 * on the page, everything else builds up to and away from it. */
function Body({
  genderTitle,
  fullName,
  courseTitle,
  courseTitleEn,
  endDate,
  durationLabel,
}: BodyProps) {
  return (
    <div className={styles.root}>
      <OrnamentRule />

      <p className={styles.lede}>بدین‌وسیله گواهی می‌شود که</p>

      <h2 className={styles.name}>
        {genderTitle}
        {fullName}
      </h2>

      <OrnamentRule />

      <p className={styles.lede}>با موفقیت دوره آموزشی</p>

      <p className={styles.course}>{courseTitle}</p>
      {courseTitleEn ? <p className={styles.courseEn}>{courseTitleEn}</p> : null}

      <p className={styles.completion}>
        را در تاریخ {endDate} به مدت {durationLabel} آموزشی با کسب حد نصاب
        مورد نظر با موفقیت به پایان رسانده است.
      </p>
    </div>
  );
}

export { Body };
