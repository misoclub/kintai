count = 0;
// 送信済みフラグ。
bSended = false;
// いいわけは一度でも編集するとデフォ値を使用しなくなる。
iiwakeChange = false;
timeChange = false;

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
        // サインイン済みかチェック。
        if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
            console.error('Sign in first');
            return;
        }

        // メールデータの作成。
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

        // メールの送信。
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

function makeBody(yourname, name, day, type, iiwake, signature) {
    // 言い訳は地味にインデントがあるのでその対応。
    iiwake = iiwake.split("\n").join("\n　　");

    // メール本文。
    var body = `${yourname}

お疲れ様です。${name}です。
​
■ 日付
　　${day}
​
■ 状況
　　${type}
​
■ 理由
　　${iiwake}
 

 以上、よろしくお願いします。
 
 ${name}

​
${signature}
`;
    return body;
}

function makeToForm(type, id, value) {
    var html = `
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

    return html;
}

function delform(id) {
    // 消す。
    $('#addform' + id).remove();
}

function OnN() {
    var n = 0;
    $('#nt').click(function() {
        ++n;
        if (n == 2) {
            alert("\u305d\u3093\u306a\u3068\u3053\u62bc\u3057\u3066\u3082\u306a\u306b\u3082\u8d77\u3053\u3089\u306a\u3044\u3088");
        } else if (n == 10) {
            alert("\u305d\u3093\u306a\u306b\u306a\u3044\u3068\u3046\u3055\u3093\u304c\u597d\u304d\u304b");
        } else if (n == 30) {
            alert("\u305f\u307e\u3063\u3066\u308b\u3001\u3063\u3066\u3084\u3064\u306a\u306e\u304b\u306a\uff1f");
        } else if (n == 60) {
            alert("\u3057\u3087\u3046\u304c\u306a\u3044\u306b\u3083\u3042\u30fb\u30fb");
        } else if (n == 100) {
            alert("\u3044\u3044\u3088\u3002");
        } else if (n == 200) {
            alert("\u306a\u3044\u3068\u3046\u3055\u3093\u304c\u4e00\u676f\u5962\u3063\u3066\u3042\u3052\u308b\u3002\n\u307f\u3093\u306a\u306b\u306f\u5185\u7dd2\u3060\u3087\u2606");
        } else if (n > 160 && n % 5 == 0) {
            alert("\u306b\u3083\u301c\u3093\uff08\u3082\u3046\u306a\u306b\u3082\u8d77\u3053\u308a\u307e\u305b\u3093\uff09");
        }
    });
}
// Webからのコピペ。日付フォーマット。
function dateToStr24HPad0DayOfWeek(date, format) {
    var weekday = ["日", "月", "火", "水", "木", "金", "土"];
    if (!format) {
        format = 'YYYY/MM/DD(WW) hh:mm:ss'
    }
    format = format.replace(/YYYY/g, date.getFullYear());
    format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
    format = format.replace(/WW/g, weekday[date.getDay()]);
    format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
    format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
    format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
    return format;
}

function load() {
    var saveData = store.get('user_data');

    // データが存在するならせっせとフォームにセットしにいく。
    if (!saveData) {
        return;
    }

    var type = $('#mail-form [name=type] option:selected').text();

    $('#myname').val(saveData["name"]);
    $('#yourname').val(saveData["yourname"]);

    // いいわけが存在するときのみ値を入れる。
    var iiwakeData = store.get(type);
    if (iiwakeData) {
        $('#iiwake').val(iiwakeData["iiwake"]);
        // 時をセット。
        $('#mail-form [name=hour] option[value="' + iiwakeData["hour"] + '"]').prop('selected', true);
        // 分をセット。
        $('#mail-form [name=minutes] option[value="' + iiwakeData["minutes"] + '"]').prop('selected', true);
    }

    var mailto = saveData["mailto"];
    if (mailto !== "") {
        var mailtoArray = mailto.split(",");
        for (var to of mailtoArray) {
            if (count == 0) {
                $('#originmailto').val(to);
                ++count;
            } else {
                var html = makeToForm("To", count, to);
                var target = $('#mailtotarget');
                target.append(html);
                ++count;
            }
        }
    }

    var mailcc = saveData["mailcc"];
    if (mailcc !== "") {
        var mailccArray = mailcc.split(",");
        for (var cc of mailccArray) {
            var html = makeToForm("Cc", count, cc);
            var target = $('#mailtotarget');
            target.append(html);
            ++count;
        }
    }

    var mailbcc = saveData["mailbcc"];
    if (mailbcc !== "") {
        var mailbccArray = mailbcc.split(",");
        for (var bcc of mailbccArray) {
            var html = makeToForm("Bcc", count, bcc);
            var target = $('#mailtotarget');
            target.append(html);
            ++count;
        }
    }
}

function save(mailto, mailcc, mailbcc, yourname, name, iiwake, type, hour, minutes) {
    var saveData = {};
    saveData["mailto"] = mailto;
    saveData["mailcc"] = mailcc;
    saveData["mailbcc"] = mailbcc;
    saveData["name"] = name;
    saveData["yourname"] = yourname;
    store.set('user_data', saveData);

    // いいわけ専用の保存データ。
    var iiwakeData = {};
    iiwakeData["iiwake"] = iiwake;
    iiwakeData["hour"] = hour;
    iiwakeData["minutes"] = minutes;
    store.set(type, iiwakeData);
}

function initialize() {
    // 今日のいい感じの日時を入れておく。
    var nowdate = new Date();
    // デフォルト今日の日付。
    var day = dateToStr24HPad0DayOfWeek(nowdate, 'YYYY年MM月DD日(WW)');
    $('#targetDate').val(day);
    // 現在時刻をセット。11時台が一番多そうなので決め打ちにする。
    // $('#mail-form [name=hour] option[value="' + nowdate.getHours() + '"]').prop('selected', true);

    // 前回のデータ読み込み。
    load();

    // 送信ボタン押せるか。
    var enable = checkSendButton();
    $('#submitbtn').prop('disabled', !enable);
    enable ? $('#errortext').hide() : $('#errortext').show();
}

function checkSendButton() {
    if (bSended) {
        return false;
    }

    var mailtoArray = [];
    $('#mailaddr .mailTo').each(function() {
        var to = $(this).val();
        if (to !== "") {
            mailtoArray.push(to);
        }
    });

    var mailto = mailtoArray.join(",");
    if (mailto === "") {
        return false;
    }

    // 自分の名前。
    var myname = $('#myname').val();
    if (myname === "") {
        return false;
    }

    var iiwakeText = $('#iiwake').val();
    if (iiwakeText === "") {
        return false;
    }

    return true;
}

$(function() {

    // 送信ボタン押せるかチェック。
    $('#mailaddr .mailTo').change(function() {
        var enable = checkSendButton();
        $('#submitbtn').prop('disabled', !enable);
        enable ? $('#errortext').hide() : $('#errortext').show();
    });
    $('#myname').change(function() {
        var enable = checkSendButton();
        $('#submitbtn').prop('disabled', !enable);
        enable ? $('#errortext').hide() : $('#errortext').show();
    });
    $('#iiwake').change(function() {
        var enable = checkSendButton();
        $('#submitbtn').prop('disabled', !enable);
        enable ? $('#errortext').hide() : $('#errortext').show();
        iiwakeChange = true;
    });
    $('#mail-form [name=hour]').change(function() {
        timeChange = true;
    });
    $('#mail-form [name=minutes]').change(function() {
        timeChange = true;
    });

    // 確認ボタン。
    $('#submitbtn').click(function() {

        // サインイン済みかチェック。
        if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
            alert("google認証されていません。\n初回はgoogle認証を行う必要があります");
            signIn();
            return;
        }

        // TOを生成。
        var mailtoArray = [];
        $('#mailaddr .mailTo').each(function() {
            var to = $(this).val();
            if (to !== "") {
                mailtoArray.push(to);
            }
        });
        var mailto = mailtoArray.join(",");

        // CCを生成。
        var mailccArray = [];
        $('#mailaddr .mailCc').each(function() {
            var cc = $(this).val();
            if (cc !== "") {
                mailccArray.push(cc);
            }
        });
        var mailcc = mailccArray.join(",");

        // BCCを生成。
        var mailbccArray = [];
        $('#mailaddr .mailBcc').each(function() {
            var bcc = $(this).val();
            if (bcc !== "") {
                mailbccArray.push(bcc);
            }
        });
        var mailbcc = mailbccArray.join(",");

        // 相手の名前。
        var yourname = $('#yourname').val();
        if (yourname === "") {
            yourname = "各位";
        }
        // 自分の名前。
        var myname = $('#myname').val();
        // 状態。
        var typeText = $('#mail-form [name=type] option:selected').text();
        var typeTextBody = typeText;
        // 年も含めた日付。
        var fullDayText = $('#targetDate').val();
        // 年を削った日付。
        var dayText = $('#targetDate').val().split("年")[1];
        // 言い訳。
        var iiwakeText = $('#iiwake').val();
        // 予定時間。存在しない場合もある。
        var timeText = "";
        // 特定の条件のときは時間のテキストを生成する。
        if (typeText == "遅刻" || typeText == "早退") {
            var hourText = $('#mail-form [name=hour] option:selected').text();
            var minutesText = $('#mail-form [name=minutes] option:selected').text();
            timeText = hourText + minutesText;
            typeTextBody += " (" + timeText + "予定)";
        }

        // 件名生成。
        const subject = "【勤怠連絡】" + myname + " " + dayText + " " + typeText + " " + timeText;

        // 本文を生成。
        const body = makeBody(yourname, myname, fullDayText, typeTextBody, iiwakeText, "このメールは【勤怠さん】から送信されました。\nhttps://misoclub.github.io/kintai/");

        // この辺からモーダル用のでっち上げテキスト生成。
        // モーダル用の署名なしテキストを生成する。
        const modalbody = makeBody(yourname, myname, fullDayText, typeTextBody, iiwakeText, "");

        var modalText = "☆宛先☆\n";
        for (var mail of mailtoArray) {
            modalText += "To:" + mail + "\n";
        }
        for (var mail of mailccArray) {
            modalText += "Cc:" + mail + "\n";
        }
        for (var mail of mailbccArray) {
            modalText += "Bcc:" + mail + "\n";
        }

        modalText += "\n☆件名☆\n";
        modalText += subject + "\n";

        // 確認モーダルを表示
        modalText += "\n☆本文☆\n";
        modalText += modalbody;
        modalText += "===========================\n";
        modalText += "この内容で送信します。\nよろしいですか？";
        modalText = modalText.split("\n").join("</br>");
        var modal = $('#exampleModalCenter').modal();
        modal.find('.modal-title').text("送信内容確認");
        modal.find('.modal-message').html(modalText);

        var hour = $('#mail-form [name=hour] option:selected').val();
        var minutes = $('#mail-form [name=minutes] option:selected').val();

        // 今回使用した情報を保存。
        save(mailto, mailcc, mailbcc, yourname, myname, iiwakeText, typeText, hour, minutes);

        // メール送信。
        $('#sendbutton').off('click');
        $('#sendbutton').on('click', function() {
            sendEmail(mailto, mailcc, mailbcc, subject, body);
            modal.modal('hide');
            alert("多分メールを送信しました！");

            // ボタンを押せなくする。
            $('#submitbtn').text("送信済");
            $('#submitbtn').prop('disabled', true);
        });
    });

    $('#typeselect').change(function() {
        var type = $(this).val();
        if (type == "遅刻" || type == "早退") {
            // 遅刻と早退は追加で時間の選択が必要
            $('.timehide').each(function() {
                $(this).show();
            });
        } else {
            // 遅刻と早退は追加で時間の選択が必要
            $('.timehide').each(function() {
                $(this).hide();
            });
        }

        // いいわけ専用。
        var iiwakeData = store.get(type);
        // いいわけを編集していないときに別の状況に切り替えたらその言い訳に切り替える。
        if (!iiwakeChange) {
            if (iiwakeData) {
                $('#iiwake').val(iiwakeData["iiwake"]);
            } else {
                $('#iiwake').val();
            }
        }
        if (!timeChange) {
            if (iiwakeData) {
                // 時をセット。
                $('#mail-form [name=hour] option[value="' + iiwakeData["hour"] + '"]').prop('selected', true);
                // 分をセット。
                $('#mail-form [name=minutes] option[value="' + iiwakeData["minutes"] + '"]').prop('selected', true);
            }
        }
    });

    // 宛先追加ボタン。
    $('#addto').click(function() {
        var html = makeToForm("To", count, "");
        var target = $('#mailtotarget');
        target.append(html);
        ++count;
    });

    $('#addcc').click(function() {
        var html = makeToForm("Cc", count, "");
        var target = $('#mailtotarget');
        target.append(html);
        ++count;
    });

    $('#addbcc').click(function() {
        var html = makeToForm("Bcc", count, "");
        var target = $('#mailtotarget');
        target.append(html);
        ++count;
    });

    $('#signout').click(function() {
        alert("google認証を解除します");
        signOut();
    });

    $('#cacheclear').click(function() {
        alert("保存してあるデータを削除します");
        store.clearAll();
        location.reload();
    });

    $('#howto').click(function() {
        alert("Googleログインをすることで自動でメールを送信します。\n必要な項目を入力して送信ボタンを押すだけでメールが送れます。送れているか不安な人はBccに自分のアドレスを追加しておくのがオススメです。\n\n免責事項\nこのサービスで発生したいかなる問題にもnaito-proは一切責任を負いません。自己責任でのご使用をお願いします。");
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
