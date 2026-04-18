/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  뉴스레터 구독 수집 — Google Apps Script
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  【설정 방법】
 *  1. Google Sheets 에서 새 스프레드시트 생성
 *  2. 상단 메뉴 → 확장 프로그램 → Apps Script
 *  3. 이 파일의 코드 전체를 붙여넣기 후 💾 저장
 *  4. 상단 → 배포 → 새 배포
 *       - 유형 선택: 웹 앱
 *       - 실행 계정: 나 (Me)
 *       - 액세스 권한: 모든 사용자 (Anyone)
 *  5. 배포 → URL 복사
 *  6. newsletter_main.html 의 SCRIPT_URL 에 붙여넣기
 *
 *  ⚠️  코드 수정 후에는 반드시 [새 버전으로 재배포] 해야 반영됩니다.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

var SHEET_NAME = '구독자'; // 시트 이름 (원하면 변경 가능)

// ── POST 요청 처리 (구독 신청) ──────────────────
function doPost(e) {
  try {
    // 이메일 파싱 (URL-encoded 형식)
    var email = '';
    if (e && e.parameter && e.parameter.email) {
      email = e.parameter.email;
    } else if (e && e.postData && e.postData.contents) {
      // JSON 형식도 처리
      try {
        email = JSON.parse(e.postData.contents).email || '';
      } catch (_) {
        var params = e.postData.contents.split('&');
        for (var i = 0; i < params.length; i++) {
          var pair = params[i].split('=');
          if (decodeURIComponent(pair[0]) === 'email') {
            email = decodeURIComponent(pair[1] || '');
          }
        }
      }
    }

    email = email.trim().toLowerCase();

    // ── 서버사이드 이메일 유효성 검사 ──
    var emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      return respond({ status: 'error', message: 'invalid_email' });
    }

    // ── Google Sheets 접근 ──
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // 헤더 행 생성 (최초 1회)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['이메일', '구독일시', '상태', '경로']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#0A1628').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    // ── 중복 구독 체크 ──
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingEmails = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
        .map(function(row) { return String(row[0]).toLowerCase().trim(); });
      if (existingEmails.indexOf(email) !== -1) {
        return respond({ status: 'duplicate', message: '이미 구독 중인 이메일입니다.' });
      }
    }

    // ── 구독자 저장 ──
    var now = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy-MM-dd HH:mm:ss'
    );
    sheet.appendRow([email, now, 'active', 'web']);

    return respond({ status: 'success' });

  } catch (err) {
    // 오류 로그 (Apps Script 실행 로그에서 확인 가능)
    console.error('Subscription error:', err.message);
    return respond({ status: 'error', message: 'server_error' });
  }
}

// ── GET 요청 차단 ───────────────────────────────
function doGet(e) {
  return respond({ status: 'error', message: 'GET not allowed' });
}

// ── 응답 헬퍼 ──────────────────────────────────
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
