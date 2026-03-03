/** Related majors that should match each other (e.g. IT and CS often same department). */
const RELATED_MAJORS = {
  'computer science': ['information technology', 'data science'],
  'information technology': ['computer science', 'data science'],
  'data science': ['computer science', 'information technology'],
};

function getRelated(major) {
  const m = normalizeMajor(major);
  const related = RELATED_MAJORS[m] || [];
  return [m, ...related];
}

/**
 * Check if a student's major matches any of the expert's majors.
 * Uses exact match and related branches (e.g. IT ↔ Computer Science ↔ Data Science).
 * @param {string} studentMajor - Student's major
 * @param {string[]} expertMajors - Expert's majors (normalized to lowercase)
 * @returns {boolean}
 */
export function majorMatches(studentMajor, expertMajors) {
  const student = normalizeMajor(studentMajor);
  if (!student) return false;
  if (expertMajors.length === 0) return false;

  const studentVariants = getRelated(student);

  for (const expert of expertMajors) {
    if (!expert) continue;
    const expertVariants = getRelated(expert);
    // Exact match or related majors (IT ↔ CS ↔ Data Science)
    for (const sv of studentVariants) {
      for (const ev of expertVariants) {
        if (sv === ev) return true;
      }
    }
    // One contains the other (e.g. "Computer Science" vs "Computer Science & Engineering")
    if (student.includes(expert) || expert.includes(student)) return true;
  }
  return false;
}

function normalizeMajor(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
