let count = 0;
// 送信済みフラグ。
let bSended = false;
// いいわけは一度でも編集するとデフォ値を使用しなくなる。
let iiwakeChange = false;
let timeChange = false;

const TIME_FIELDS = ['hour', 'minutes', 'hour_2', 'minutes_2', 'hour_3', 'minutes_3'];

// [当日メッセージ, 翌日以降メッセージ]
const SUCCESS_MESSAGES = {
    "出社":             ["コロナに負けないで出社してすごい😉", "病気に気をつけてね🏢"],
    "遅刻":             ["あせらずお気をつけてお越し下さい😉", "お気をつけてお越し下さい🏢"],
    "早退":             ["ちゃっちゃと仕事を終わらせて帰りましょう！👋", "予定時刻になったら帰りましょう！🏃"],
    "有給取得":         ["良い休日を！ゆっくり休んでください🛏", "よい休日になりますように🙏"],
    "代休取得":         ["働いた分、今日はゆっくり休みましょう！🍺", "働いた分、当日はゆっくり休みましょう！🍺"],
    "欠勤":             ["おつかれさまです。ゆっくり休んでください🦊", "おつかれさまです。ゆっくり休んでください🦁"],
    "直行":             ["気をつけていってらっしゃいませ！", "気をつけていってらっしゃいませ！"],
    "直帰":             ["気をつけていってらっしゃいませ！", "気をつけていってらっしゃいませ！"],
    "自宅作業":         ["家での作業おつかれさまです！！🏠", "家での作業がんばりましょう・・！"],
    "休日勤務":         ["休日勤務おつかれさまです！", "休日勤務がんばりましょう・・！💪"],
    "リモートワーク 開始": ["リモート作業頑張りましょう！", "当日はリモート作業がんばりましょう💪"],
    "リモートワーク 終了": ["リモート作業お疲れ様でした！", "リモート作業おつかれさまです。"],
};

// タイプごとの class 表示状態。マップに無いキーは触らない。
const TYPE_VISIBILITY = {
    "遅刻":             { timehide: true,  timehide_remote: false },
    "早退":             { timehide: true,  timehide_remote: false },
    "リモートワーク 開始": { timehide: false, timehide_remote: true, remote_start: true,  remote_end: false, naiyo: true, riyu: false },
    "リモートワーク 終了": { timehide: false, timehide_remote: true, remote_start: false, remote_end: true,  naiyo: true, riyu: false },
};
const DEFAULT_VISIBILITY = { timehide: false, timehide_remote: false, naiyo: false, riyu: true };

function getParam(name, url) {
    const u = new URL(url || window.location.href);
    return u.searchParams.get(name);
}

function InitializeSuccess() {
    const iiwake = getParam("iiwake");
    const isToday = getParam("today") == 1;
    const messages = SUCCESS_MESSAGES[iiwake];
    const text = messages ? (isToday ? messages[0] : messages[1]) : "";
    $(".success_message").text(text);
}

async function signIn() {
    try {
        await gapi.auth2.getAuthInstance().signIn();
        console.log('Signed in');
    } catch (e) {
        console.error(e);
    }
}

async function signOut() {
    try {
        await gapi.auth2.getAuthInstance().signOut();
        console.log('Signed out');
    } catch (e) {
        console.error(e);
    }
}

async function sendEmail(sendto, sendcc, sendbcc, subject, body) {
    try {
        if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
            console.error('Sign in first');
            return;
        }

        const mimeData = [
            `To: ${sendto}`,
            `Cc: ${sendcc}`,
            `Bcc: ${sendbcc}`,
            'Subject: =?utf-8?B?' + btoa(unescape(encodeURIComponent(subject))) + '?=',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 7bit',
            '',
            body,
        ].join('\n').trim();
        const raw = btoa(unescape(encodeURIComponent(mimeData))).replace(/\+/g, '-').replace(/\//g, '_');

        await gapi.client.gmail.users.messages.send({
            'userId': 'me',
            'resource': { raw: raw },
        });
        console.log('Sent email');
    } catch (e) {
        console.error(e);
        alert("何かしらのエラーが発生しました");
    }
}

function makeBody(yourname, name, day, type, iiwake, signature, addtionalText, riyuu) {
    // 言い訳は地味にインデントがあるのでその対応。
    const indentedIiwake = iiwake.replaceAll("\n", "\n　　");
    return `${yourname}

お疲れ様です。${name}です。
​
■ 日付
　　${day}
​
■ 状況
　　${type}
​${addtionalText}
■ ${riyuu}
　　${indentedIiwake}


 以上、よろしくお願いします。

 ${name}

​
${signature}
`;
}

function makeToForm(type, id, value) {
    return `
<div class="input-group mb-3" id="addform${id}">
    <div class="input-group-prepend">
        <div class="input-group-text">${type}: </div>
    </div>
    <input type="email" class="form-control mail${type}" aria-label="" placeholder="example@example.com" value="${value}">
    <div class="input-group-append">
        <span class="input-group-text">
   	        <button type="button" class="close" aria-label="Close" id="delbtn" onclick="delform(${id});"><span aria-hidden="true">&times;</span></button>
        </span>
    </div>
</div>
`;
}

function delform(id) {
    $('#addform' + id).remove();
}

function OnN() {
    const milestones = {
        2:   "そんなとこ押してもなにも起こらないよ",
        10:  "そんなにないとうさんが好きか",
        30:  "たまってる、ってやつなのかな？",
        60:  "しょうがないにゃあ・・",
        100: "いいよ。",
        160: "ないとうさんが一杯奢ってあげる。\nみんなには内緒だょ☆",
    };
    let n = 0;
    $('#nt').click(() => {
        ++n;
        if (n in milestones) {
            alert(milestones[n]);
        } else if (n > 180 && n % 5 === 0) {
            alert("にゃ〜ん（もうなにも起こりません）");
        }
    });
}

// Webからのコピペ。日付フォーマット。
function dateToStr24HPad0DayOfWeek(date, format) {
    const weekday = ["日", "月", "火", "水", "木", "金", "土"];
    if (!format) {
        format = 'YYYY/MM/DD(WW) hh:mm:ss';
    }
    return format
        .replace(/YYYY/g, date.getFullYear())
        .replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2))
        .replace(/DD/g, ('0' + date.getDate()).slice(-2))
        .replace(/WW/g, weekday[date.getDay()])
        .replace(/hh/g, ('0' + date.getHours()).slice(-2))
        .replace(/mm/g, ('0' + date.getMinutes()).slice(-2))
        .replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
}

function applyIiwakeTimes(iiwakeData) {
    for (const f of TIME_FIELDS) {
        $(`#mail-form [name=${f}] option[value="${iiwakeData[f]}"]`).prop('selected', true);
    }
}

function appendRecipientsFromCsv(csv, kind, useFirstAsOrigin = false) {
    if (csv === "") return;
    for (const addr of csv.split(",")) {
        if (useFirstAsOrigin && count == 0) {
            $('#originmailto').val(addr);
        } else {
            $('#mailtotarget').append(makeToForm(kind, count, addr));
        }
        ++count;
    }
}

function collectMails(selector) {
    const arr = [];
    $(selector).each(function() {
        const v = $(this).val();
        if (v !== "") arr.push(v);
    });
    return arr;
}

function load() {
    const saveData = store.get('user_data');
    if (!saveData) return;

    let type = $('#mail-form [name=type] option:selected').text();
    if (saveData["type"] && saveData["type"] != "") {
        type = saveData["type"];
    }

    $('#myname').val(saveData["name"]);
    $('#yourname').val(saveData["yourname"]);
    // 前回送信したタイプを取得。
    $('#typeselect').val(type);

    // タイプ変更に伴うレイアウト変更。
    OnChangeType();

    // いいわけが存在するときのみ値を入れる。
    const iiwakeData = store.get(type);
    if (iiwakeData) {
        $('#iiwake').val(iiwakeData["iiwake"]);
        applyIiwakeTimes(iiwakeData);
    }

    appendRecipientsFromCsv(saveData["mailto"], "To", true);
    appendRecipientsFromCsv(saveData["mailcc"], "Cc");
    appendRecipientsFromCsv(saveData["mailbcc"], "Bcc");
}

function save(mailto, mailcc, mailbcc, yourname, name, iiwake, type, hour, minutes, hour_2, minutes_2, hour_3, minutes_3) {
    store.set('user_data', {
        mailto, mailcc, mailbcc,
        name, yourname, type,
    });

    // いいわけ専用の保存データ。
    store.set(type, {
        iiwake,
        hour, minutes,
        hour_2, minutes_2,
        hour_3, minutes_3,
    });
}

function updateSubmitButton() {
    const enable = checkSendButton();
    $('#submitbtn').prop('disabled', !enable);
    $('#errortext').toggle(!enable);
}

function initialize() {
    // 今日のいい感じの日時を入れておく。
    const nowdate = new Date();
    const day = dateToStr24HPad0DayOfWeek(nowdate, 'YYYY年MM月DD日(WW)');
    $('#targetDate').val(day);

    // 前回のデータ読み込み。
    load();

    updateSubmitButton();
}

function OnChangeType() {
    const type = $('#typeselect').val();
    const visibility = TYPE_VISIBILITY[type] || DEFAULT_VISIBILITY;
    for (const [cls, show] of Object.entries(visibility)) {
        $('.' + cls).toggle(show);
    }

    // いいわけ専用。
    const iiwakeData = store.get(type);
    // いいわけを編集していないときに別の状況に切り替えたらその言い訳に切り替える。
    if (!iiwakeChange) {
        if (iiwakeData) {
            $('#iiwake').val(iiwakeData["iiwake"]);
        }
        updateSubmitButton();
    }
    if (!timeChange && iiwakeData) {
        applyIiwakeTimes(iiwakeData);
    }
}

function checkSendButton() {
    if (bSended) return false;

    const mailtoArray = collectMails('#mailaddr .mailTo');
    if (mailtoArray.length === 0) return false;
    if ($('#myname').val() === "") return false;
    if ($('#iiwake').val() === "") return false;

    return true;
}

$(function() {

    // 送信ボタン押せるかチェック。
    $('#mailaddr .mailTo, #myname').change(updateSubmitButton);
    $('#iiwake').change(function() {
        updateSubmitButton();
        iiwakeChange = true;
    });

    // 時刻が変更されたかを記録。
    const timeFieldSelector = TIME_FIELDS.map(f => `#mail-form [name=${f}]`).join(',');
    $(timeFieldSelector).change(() => {
        timeChange = true;
    });

    // 確認ボタン。
    $('#submitbtn').click(function() {

        if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
            alert("google認証されていません。\n初回はgoogle認証を行う必要があります");
            signIn();
            return;
        }

        const mailtoArray = collectMails('#mailaddr .mailTo');
        const mailccArray = collectMails('#mailaddr .mailCc');
        const mailbccArray = collectMails('#mailaddr .mailBcc');
        const mailto = mailtoArray.join(",");
        const mailcc = mailccArray.join(",");
        const mailbcc = mailbccArray.join(",");

        let yourname = $('#yourname').val();
        if (yourname === "") yourname = "各位";
        const myname = $('#myname').val();
        const typeText = $('#mail-form [name=type] option:selected').text();
        let typeTextBody = typeText;
        let typeTextTmp = typeText;
        const fullDayText = $('#targetDate').val();
        const dayText = fullDayText.split("年")[1];
        const iiwakeText = $('#iiwake').val();
        let timeText = "";
        let addtionalText = "";
        let riyuu = "理由";

        // 特定の条件のときは時間のテキストを生成する。
        if (typeText == "遅刻" || typeText == "早退") {
            const hourText = $('#mail-form [name=hour] option:selected').text();
            const minutesText = $('#mail-form [name=minutes] option:selected').text();
            timeText = hourText + minutesText;
            typeTextBody += " (" + timeText + "予定)";
        } else if (typeText == "リモートワーク 開始" || typeText == "リモートワーク 終了") {
            const hourText = $('#mail-form [name=hour_2] option:selected').text();
            const minutesText = $('#mail-form [name=minutes_2] option:selected').text();
            const hourText2 = $('#mail-form [name=hour_3] option:selected').text();
            const minutesText2 = $('#mail-form [name=minutes_3] option:selected').text();
            const startCompact = hourText.replace("時", ":") + minutesText.replace("分", "");
            const endCompact = hourText2.replace("時", ":") + minutesText2.replace("分", "");
            if (typeText == "リモートワーク 開始") {
                timeText = `${startCompact}-${endCompact}`;
                addtionalText = `\n■ 予定作業時間\n　　${hourText}${minutesText} 〜${hourText2}${minutesText2}\n`;
            } else {
                timeText = `${endCompact}終了`;
                addtionalText = `\n■ 実作業時間\n　　${hourText}${minutesText} 〜${hourText2}${minutesText2}\n`;
            }
            typeTextTmp = "リモートワーク";
            riyuu = "作業内容";
        }

        const subject = `【勤怠連絡】${myname} ${dayText} ${typeTextTmp} ${timeText}`;
        const body = makeBody(yourname, myname, fullDayText, typeTextBody, iiwakeText, "このメールは【勤怠さん】から送信されました。\nhttps://misoclub.github.io/kintai/", addtionalText, riyuu);

        // モーダル用の署名なしテキストを生成する。
        const modalbody = makeBody(yourname, myname, fullDayText, typeTextBody, iiwakeText, "", addtionalText, riyuu);

        const modalLines = ["☆宛先☆"];
        for (const mail of mailtoArray) modalLines.push("To:" + mail);
        for (const mail of mailccArray) modalLines.push("Cc:" + mail);
        for (const mail of mailbccArray) modalLines.push("Bcc:" + mail);
        modalLines.push("", "☆件名☆", subject, "", "☆本文☆", modalbody + "===========================", "この内容で送信します。\nよろしいですか？");
        const modalText = modalLines.join("\n").replaceAll("\n", "</br>");

        const modal = $('#exampleModalCenter').modal();
        modal.find('.modal-title').text("送信内容確認");
        modal.find('.modal-message').html(modalText);

        const hour = $('#mail-form [name=hour] option:selected').val();
        const minutes = $('#mail-form [name=minutes] option:selected').val();
        const hour_2 = $('#mail-form [name=hour_2] option:selected').val();
        const minutes_2 = $('#mail-form [name=minutes_2] option:selected').val();
        const hour_3 = $('#mail-form [name=hour_3] option:selected').val();
        const minutes_3 = $('#mail-form [name=minutes_3] option:selected').val();

        // 今回使用した情報を保存。
        save(mailto, mailcc, mailbcc, yourname, myname, iiwakeText, typeText, hour, minutes, hour_2, minutes_2, hour_3, minutes_3);

        // メール送信。
        $('#sendbutton').off('click').on('click', function() {
            sendEmail(mailto, mailcc, mailbcc, subject, body);
            modal.modal('hide');

            const today = dateToStr24HPad0DayOfWeek(new Date(), 'YYYY年MM月DD日(WW)') == fullDayText ? 1 : 0;

            setTimeout(() => {
                window.location.href = `./success.html?iiwake=${typeText}&today=${today}`;
            }, 800);

            // ボタンを押せなくする。
            $('#submitbtn').text("送信済").prop('disabled', true);
        });
    });

    $('#typeselect').change(OnChangeType);

    // 宛先追加ボタン。
    function addRecipientForm(kind) {
        $('#mailtotarget').append(makeToForm(kind, count, ""));
        ++count;
    }
    $('#addto').click(() => addRecipientForm("To"));
    $('#addcc').click(() => addRecipientForm("Cc"));
    $('#addbcc').click(() => addRecipientForm("Bcc"));

    $('#signout').click(() => {
        alert("google認証を解除します");
        signOut();
    });

    $('#signin').click(() => {
        if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
            alert("すでにSign Inしています");
            return;
        }
        signIn();
    });

    $('#cacheclear').click(() => {
        alert("保存してあるデータを削除します");
        store.clearAll();
        location.reload();
    });

    $('#howto').click(() => {
        alert("Googleログインをすることで自動でメールを送信します。\n必要な項目を入力して送信ボタンを押すだけでメールが送れます。送れているか不安な人はBccに自分のアドレスを追加しておくのがオススメです。\n");
    });

    $('.date').datepicker({
        todayBtn: 'linked',
        format: "yyyy年mm月dd日(D)",
        autoclose: true,
        todayHighlight: true,
        daysOfWeekHighlighted: "0,6",
        language: "ja",
    });

    $('.dummy-date').change(function() {
        $(`input[name=${$(this).data('real')}]`).val($(this).val());
    });

    OnN();
});
