# תלם+ (Telem Plus)

ממשק חדש ונעים למערכת **תלם** ([telem.tel-aviv.gov.il](https://telem.tel-aviv.gov.il)): מצב כהה, טופס דיווח מסודר בשלבים, מצב כתיבה ממוקדת וחיפוש מהיר (Ctrl+K).
הכלי משנה רק את התצוגה. הוא לא ממלא שדות, לא שולח דיווחים, ולא קורא או שומר את תוכן הדיווחים.

**👉 דף ההתקנה: https://iftachts.github.io/telem-plus/**

> כלי קהילתי ולא רשמי. לא מטעם עיריית תל אביב-יפו.

## שתי דרכים להשתמש

| | סימנייה חכמה | תוסף לכרום / Edge |
|---|---|---|
| התקנה | גוררים כפתור לסרגל הסימניות | Load unpacked במצב מפתח |
| הרשאות | אין | הרשאת אחסון בלבד |
| הפעלה | לחיצה על הסימנייה בכל כניסה לתלם | אוטומטית |
| עדכונים | אוטומטיים (מתוך GitHub Pages) | מחליפים את הקבצים ומרעננים |

## בטלפון

| | אנדרואיד | אייפון |
|---|---|---|
| הדרך הקלה (תוסף, אוטומטי) | Firefox ← התוסף מ-addons.mozilla.org | דפדפן Orion ← אותו תוסף מ-addons.mozilla.org |
| בלי דפדפן חדש | סימנייה (הוראות בדף ההפצה) | סימנייה (הוראות בדף ההפצה) |

גרסת Firefox של התוסף נבנית לקובץ `telem-plus-firefox.zip`, ומעלים אותה ל-[addons.mozilla.org](https://addons.mozilla.org/developers/).

## מבנה

```
extension/        התוסף, וגם המקור היחיד של הקוד
  theme.css       כל העיצוב (תחת html.tg-on, כך שכיבוי מחזיר את המקור)
  content.js      התוספות: סרגל עליון, כרטיס פתיחה, מונים, התקדמות בטופס, מצב כתיבה, חיפוש מהיר
  popup.*         חלון ההגדרות של התוסף
telem-plus.js     נוצר מ-extension/ על ידי build.mjs; זה הקובץ שהסימנייה טוענת
index.html        דף ההפצה (GitHub Pages)
build.mjs         בניית telem-plus.js ו-firefox-manifest.json
package.sh        בונה הכול ואורז את telem-plus-extension.zip (כרום) ואת telem-plus-firefox.zip (Firefox)
```

## עדכון

```bash
# עורכים את extension/theme.css או את extension/content.js, ואז:
# מעלים את המספר ב-extension/manifest.json (version), ואז:
./package.sh
git commit -am "..." && git push
# ואת telem-plus-firefox.zip מעלים כגרסה חדשה ב-addons.mozilla.org
```

משתמשי הסימנייה מקבלים את העדכון תוך שעה בערך (הסימנייה מבקשת גרסה חדשה פעם בשעה, ו-GitHub Pages שומר עותק למשך כעשר דקות).

## אבטחה

הסימנייה מריצה בתוך תלם את הקובץ `telem-plus.js` מהמאגר הזה. לכן מי שיכול לדחוף קוד למאגר יכול לשנות את מה שרץ אצל המשתמשים. כדאי להשאיר את הרשאות הכתיבה למאגר מצומצמות, ולהפעיל אימות דו-שלבי בחשבון GitHub.
