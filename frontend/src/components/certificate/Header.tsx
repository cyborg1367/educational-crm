import * as React from "react";

import styles from "./Header.module.css";

/** Top row: institute logo (left), centered bilingual title. Laid out in
 * plain LTR so "left"/"right" mean what they say; only the title text
 * itself switches to RTL. */
function Header() {
  return (
    <header className={styles.root}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/kadoos-logo.png"
        alt="کادوس"
        className={styles.logo}
        width={92}
        height={92}
      />

      <div className={styles.titleBlock}>
        <div className={styles.ornament} aria-hidden>
          <span className={styles.ornamentLine} />
          <span className={styles.ornamentDot} />
          <span className={styles.ornamentLine} />
        </div>
        <h1 className={styles.titleFa}>گواهینامه پایان دوره</h1>
        <p className={styles.titleEn}>Certificate of Completion</p>
      </div>

      <div className={styles.spacer} aria-hidden />
    </header>
  );
}

export { Header };
