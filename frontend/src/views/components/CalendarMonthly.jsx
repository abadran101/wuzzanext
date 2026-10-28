import Calendar from 'react-calendar'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../../contexts/LocalizationContext'
import { getPriorityColor } from '../../utils/Colors'
import { dateLocale, shortMonth, weekdayLetter } from '../../utils/DateLocale'
import styles from './Calendar.module.css'
const CalendarMonthly = ({ chores, onDateChange }) => {
  const { firstDayOfWeek } = useLocalization()
  const { i18n } = useTranslation()
  const locale = dateLocale(i18n.resolvedLanguage)
  const calendarType =
    firstDayOfWeek === 1
      ? 'iso8601'
      : firstDayOfWeek === 6
        ? 'islamic'
        : 'gregory'
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayChores = chores.filter(chore => {
        const choreDate = new Date(chore.nextDueDate).toLocaleDateString()
        const tileDate = date.toLocaleDateString()
        return choreDate === tileDate
      })
      if (dayChores.length === 0) {
        return (
          <div className={styles.dotContainer}>
            <span className={styles.dotEmpty}></span>
          </div>
        )
      }
      if (dayChores.length > 3) {
        return (
          <div className={styles.dotContainer}>
            <span
              className={styles.dotWithLine}
              style={{
                backgroundColor: getPriorityColor(dayChores[0].priority),
              }}
            ></span>
          </div>
        )
      }

      return (
        <div className={styles.dotContainer}>
          {dayChores.map((chore, index) => {
            return (
              <span
                key={index}
                className={styles.dot}
                style={{
                  backgroundColor: getPriorityColor(chore.priority),
                }}
              ></span>
            )
          })}
        </div>
      )
    }
    return null
  }
  return (
    <div className={styles.reactCalendar}>
      <Calendar
        tileContent={tileContent}
        calendarType={calendarType}
        locale={locale}
        onChange={d => {
          onDateChange(new Date(d))
        }}
        // one letter per weekday (S M T ... in English)
        formatShortWeekday={(_, date) => weekdayLetter(date, locale)}
        // short month names (Jan, Feb ... in English)
        formatMonth={(_, date) => shortMonth(date, locale)}
      />
    </div>
  )
}

export default CalendarMonthly
