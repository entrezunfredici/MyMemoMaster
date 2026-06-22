const dayjs = require('dayjs')

class GradingService {
  /**
   * normalisation basique : trim, lowercase, collapse spaces
   * @param {string} text
   * @returns {string}
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') return ''
    return text.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  /**
   * parser un string en date
   * retourne null si pas parseable, ou un objet { year, month, day } (month 1-12, day 1-31)
   * @param {string} dateString
   * @returns {object|null}
   */
  parseDateSafe(dateString) {
    if (!dateString || typeof dateString !== 'string') return null

    const normalized = this.normalizeText(dateString)

    // Check si c'est une année seule (e.g., "1939")
    const yearOnlyMatch = normalized.match(/^(19|20)\d{2}$/)
    if (yearOnlyMatch) {
      return {
        year: parseInt(yearOnlyMatch[0], 10),
        month: null,
        day: null
      }
    }

    // check si le string contient des éléments de date (chiffres, mois, séparateurs)
    const hasDatePattern =
      /\b(0?[1-9]|1[0-2])\b|[1-3]?[0-9](st|nd|rd|th)?|er\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b|\/|-/i.test(
        normalized
      )

    if (hasDatePattern) {
      // essayer de parser d'abord en format ISO strict (YYYY-MM-DD)
      const parsed1 = dayjs(normalized, 'YYYY-MM-DD', true)
      if (parsed1.isValid() && parsed1.year() >= 1800 && parsed1.year() <= 2100) {
        return {
          year: parsed1.year(),
          month: parsed1.month() + 1,
          day: parsed1.date()
        }
      }

      // essaye de paser avec les noms des mois
      const parsed2 = dayjs(normalized)
      if (parsed2.isValid() && parsed2.year() >= 1800 && parsed2.year() <= 2100) {
        return {
          year: parsed2.year(),
          month: parsed2.month() + 1,
          day: parsed2.date()
        }
      }
    }

    return null
  }

  /**
   * compare correct answer and student answer for date questions
   * @param {string} correctAnswer - The reference answer
   * @param {string} studentAnswer - The student's answer
   * @returns {object} - { is_correct, score, strategy, explanation }
   */
  gradeDateAnswer(correctAnswer, studentAnswer) {
    const correctNorm = this.normalizeText(correctAnswer)
    const studentNorm = this.normalizeText(studentAnswer)

    // parse les deux
    const correctParsed = this.parseDateSafe(correctNorm)
    const studentParsed = this.parseDateSafe(studentNorm)

    let isCorrect = false
    let explanation = ''

    // Case 1: les deux parse comme des dates complètes (YMD) → comparer YMD
    if (correctParsed && studentParsed && correctParsed.month && studentParsed.month) {
      isCorrect =
        correctParsed.year === studentParsed.year &&
        correctParsed.month === studentParsed.month &&
        correctParsed.day === studentParsed.day

      if (isCorrect) {
        explanation = `Correct. The date is ${correctParsed.day}/${correctParsed.month}/${correctParsed.year}.`
      } else {
        explanation = `Incorrect. Expected ${correctParsed.day}/${correctParsed.month}/${correctParsed.year}, got ${studentParsed.day}/${studentParsed.month}/${studentParsed.year}.`
      }
      return {
        is_correct: isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        strategy: 'date',
        explanation
      }
    }

    // Case 2: les deux parse comme des années seules → comparer années seulement
    if (
      correctParsed &&
      studentParsed &&
      correctParsed.month === null &&
      studentParsed.month === null
    ) {
      isCorrect = correctParsed.year === studentParsed.year

      if (isCorrect) {
        explanation = `Correct. The year is ${correctParsed.year}.`
      } else {
        explanation = `Incorrect. Expected year ${correctParsed.year}, got ${studentParsed.year}.`
      }
      return {
        is_correct: isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        strategy: 'date',
        explanation
      }
    }

    // Case 3: les deux parse comme des dates mais l'une ou les deux n'ont pas de mois/jour → comparer années seulement
    if (correctParsed && studentParsed) {
      isCorrect = correctParsed.year === studentParsed.year

      if (isCorrect) {
        explanation = `Correct. The year is ${correctParsed.year}.`
      } else {
        explanation = `Incorrect. Expected year ${correctParsed.year}, got ${studentParsed.year}.`
      }
      return {
        is_correct: isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        strategy: 'date',
        explanation
      }
    }

    // Case 4: au moins une des réponses ne parse pas comme une date → faire une comparaison textuelle normalisée
    if (correctNorm === studentNorm) {
      explanation = 'Correct. Text matches.'
      return {
        is_correct: true,
        score: 1.0,
        strategy: 'date',
        explanation
      }
    }

    explanation = `Incorrect. Expected "${correctNorm}", got "${studentNorm}".`
    return {
      is_correct: false,
      score: 0.0,
      strategy: 'date',
      explanation
    }
  }
}

module.exports = new GradingService()
