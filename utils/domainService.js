// utils/domainService.js

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.com.tw',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com'
])

function looksLikeSchoolDomain(domain) {
  const d = domain.toLowerCase()

  if (d.endsWith('.edu') || d.endsWith('.edu.tw') || d.endsWith('.edu.hk')) {
    return true
  }

  if (d.endsWith('.ac.jp') || d.endsWith('.ac.uk')) {
    return true
  }

  return false
}

// 純分類邏輯：給一個 domain，回傳 type / source / confidence
function classifyDomain(domain) {
  const d = domain.toLowerCase()

  if (FREE_EMAIL_DOMAINS.has(d)) {
    return {
      type: 'free',
      source: 'manual',
      confidence: 100
    }
  }

  if (looksLikeSchoolDomain(d)) {
    return {
      type: 'school',
      source: 'heuristic',
      confidence: 70
    }
  }

  // 先全部當公司，之後你可以在管理頁手動修正
  return {
    type: 'company',
    source: 'heuristic',
    confidence: 50
  }
}

// 這個是之後 server 會呼叫的主功能：
// 給 email，確保 domains 表裡有這個 domain，然後回傳 domain_id
export async function getOrCreateDomainId(db, email) {
  const normalized = email.trim().toLowerCase()
  const parts = normalized.split('@')
  if (parts.length !== 2) {
    throw new Error('Invalid email: ' + email)
  }

  const domainStr = parts[1]

  // 1. 先看看資料庫有沒有
  let domainRow = await db.get(
    'SELECT * FROM domains WHERE domain = ?',
    domainStr
  )

  // 2. 沒有就依分類邏輯插入一筆
  if (!domainRow) {
    const cls = classifyDomain(domainStr)

    const result = await db.run(
      `
      INSERT INTO domains (domain, type, source, confidence)
      VALUES (?, ?, ?, ?)
      `,
      domainStr,
      cls.type,
      cls.source,
      cls.confidence
    )

    const id = result.lastID
    domainRow = await db.get(
      'SELECT * FROM domains WHERE id = ?',
      id
    )
  }

  return domainRow.id
}
