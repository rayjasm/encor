/* CSRF対策 */
axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
axios.defaults.xsrfCookieName = "csrftoken";

let calendar;
const pathParts = window.location.pathname.split("/");
const userId = pathParts[pathParts.length - 2];

document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("calendar");
  /* カレンダーの表示範囲 */
  const today = new Date();
  const startDate = new Date(
    today.getFullYear() - 1,
    today.getMonth(),
    today.getDate()
  );
  const endDate = new Date(
    today.getFullYear() + 1,
    today.getMonth(),
    today.getDate()
  );

  calendar = new FullCalendar.Calendar(calendarEl, {
    /* 設定 */
    initialView: "dayGridMonth" /* カレンダーの種類 */,
    locale: "ja",

    /* 機能 */
    editable: true /* イベントの編集可否 */,

    /* 時間 */
    slotDuration: "00:15:00",
    slotLabelInterval: "01:00",

    /* 表示 */
    nowIndicator: true /* 現在時刻バー */,
    businessHours: true /* 休日を表示? */,
    dayMaxEvents: true,
    buttonText: {
      today: "今日",
      month: "月",
      week: "週",
      day: "日",
    },
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,dayGridWeek,dayGridDay",
    },
    /* 日本の祝日(Google の公開カレンダー)
       下の API キーはブラウザ用のキーで、意図的にソースコードに含めている。
       - 用途は Google が公開している「日本の祝日」カレンダーの読み取りだけで、
         このキーで個人のカレンダーなど非公開データにはアクセスできない
       - FullCalendar がブラウザから直接 Google Calendar API を呼ぶ仕組みのため、
         キーはクライアント側に置く必要があり、閲覧者には必ず見える(隠す手段がない)
       - 不正利用を防ぐため、Google Cloud Console 側で HTTP リファラー制限と
         利用 API の制限(Calendar API のみ)をかけて運用する
    */
    eventSources: {
      googleCalendarApiKey: "AIzaSyCzakJHMWzQNPxRObFBbgS5Btntz4pcsK8",
      googleCalendarId: "japanese__ja@holiday.calendar.google.com",
    },
    validRange: {
      start: startDate,
      end: endDate,
    },

    /* サイジング */
    height: 700,

    /* 予定の表示 */
    eventDisplay: "block" /* 時刻付きの予定も塗りつぶしで表示 */,
    eventTimeFormat: {
      hour: "2-digit",
      minute: "2-digit",
      meridiem: false,
    },
    /* 日付クリック時 */
    selectable: true,
    unselectAuto: true,
    select: (arg) => {
      initEditModal(arg);
    },
    /* イベントクリック時 */
    eventClick: function (arg) {
      console.log(
        "取得したデータ:",
        arg.event.title,
        arg.event.start,
        arg.event.end,
        arg.event.location,
        arg.event.message
      );
      if (arg.event.title !== null) {
        showModalData(arg);
        return;
      }
    },

    events: function (info, successCallback, failureCallback) {
      axios
        .get(`/get/plans/${userId}/`)
        .then((response) => {
          const events = response.data.events.map((e) => ({
            ...e,
            textColor: textColorFor(e.color),
          }));
          console.log("取得したイベントデータ:", events);
          calendar.removeAllEvents();
          successCallback(events);
        })
        .catch((error) => {
          console.error("Error fetching events:", error);
        });
    },
  });

  calendar.render();
});

/* 予定の詳細の表示 */
const showModalData = (data) => {
  removeAlreadyModal();
  const defModal = document.getElementById("show-modal");
  const modal = defModal.cloneNode(true);
  modal.id = "modal";

  setupModalPosition(modal, data.jsEvent);
  document.body.appendChild(modal);

  modal.style.display = "flex";

  const closeButton = modal.querySelector("#cancel");
  closeButton.addEventListener("click", () => {
    modal.remove();
  });
  updateToModal(modal, data);
  console.log("showModalData()", data);
};

/* モーダルを使用した予定の登録 */
const initEditModal = (data) => {
  removeAlreadyModal();
  const defModal = document.getElementById("modal-template");
  const modal = defModal.cloneNode(true);
  modal.id = "modal";

  setupModalPosition(modal, data.jsEvent);
  document.body.appendChild(modal);

  if (data.event === undefined) {
    document.querySelector("#modal .delete").remove();
  }
  //メモ: キャンセルボタンが使えない原因を調べる
  setupModalData(modal, data);
  registerEditModalEvent(modal, data);
};

const setupModalPosition = (modal, e) => {
  modal.style.display = "flex";
  modal.style.position = "absolute";
  modal.style.zIndex = 9999;

  const position = calcModalPosition(e);
  console.log("Calculated position:", position);
  modal.style.left = `${position.x}px`;
  modal.style.top = `${position.y}px`;
};

const calcModalPosition = (e) => {
  const windowWidth = window.outerWidth;

  const y = e.pageY + 16;
  let x = e.pageX;

  if (e.pageX <= 125) {
    x = e.pageX;
  } else if (e.pageX > 125 && windowWidth - e.pageX > 125) {
    x = e.pageX - 125;
  } else if (windowWidth - e.pageX <= 125) {
    x = e.pageX - 250;
  }

  return {
    x: x,
    y: y,
  };
};

// 開いているモーダルをすべて閉じる(同時に開くのは常に1つだけにする)
const removeAlreadyModal = () => {
  document.querySelectorAll("#modal").forEach((modal) => modal.remove());
};

/* モーダルの外側をクリック、または Esc キーで閉じる */
// mousedown を使うのは、モーダルを開くクリック自体(mouseup 以降に生成)で
// 閉じてしまわないようにするため
document.addEventListener("mousedown", (e) => {
  const modal = document.getElementById("modal");
  if (modal && !modal.contains(e.target)) {
    removeAlreadyModal();
    calendar.unselect();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.getElementById("modal")) {
    removeAlreadyModal();
    calendar.unselect();
  }
});

// モーダル登録処理
const registerEditModalEvent = (modal, arg) => {
  const start = modal.querySelector("#start");
  const end = modal.querySelector("#end");
  const name = modal.querySelector("#name");
  const color = modal.querySelector("#color");
  const contact = modal.querySelector("#contact");
  const message = modal.querySelector("#message");

  // 送信
  const saveButton = modal.querySelector("#save");
  if (saveButton) {
    saveButton.addEventListener("click", (e) => {
      e.preventDefault();

      const eventData = {
        start: start.value,
        end: end.value,
        name: name.value.trim(),
        color: color.value,
        contact: contact.value.trim(),
        message: message.value.trim(),
      };

      if (!eventData.name) {
        showToast("予定の名前を入力してください", "error");
        name.focus();
        return;
      }
      if (!eventData.start || !eventData.end) {
        showToast("開始時刻と終了時刻を入力してください", "error");
        return;
      }

      // 承諾されるまではカレンダーに表示しない(仮表示もしない)。
      // 送信結果は画面上部の通知で伝える
      sendOffer(eventData);

      calendar.unselect();
      modal.remove();
    });
  }

  // キャンセル
  const cancelButton = modal.querySelector("#cancel");
  cancelButton.addEventListener("click", (e) => {
    e.preventDefault();

    calendar.unselect();
    modal.remove();
  });
};

// モーダルに既存イベントを表示
const updateToModal = (modal, data) => {
  const title = modal.querySelector("#modal-title");
  const start = modal.querySelector("#modal-start");
  const end = modal.querySelector("#modal-end");
  const location = modal.querySelector("#modal-location");
  const message = modal.querySelector("#modal-message");

  const event = data.event;
  title.textContent = event.title || "";
  start.textContent = formatDatetime(event.start);
  end.textContent = formatDatetime(event.end);
  location.textContent = event.extendedProps.location || "";
  message.textContent = event.extendedProps.message || "";
};

// 背景色の明るさから読みやすい文字色(濃いグレー or 白)を返す
function textColorFor(bgColor) {
  if (!bgColor || !/^#[0-9a-f]{6}$/i.test(bgColor)) return undefined;
  const r = parseInt(bgColor.slice(1, 3), 16);
  const g = parseInt(bgColor.slice(3, 5), 16);
  const b = parseInt(bgColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#2b2b2b" : "#ffffff";
}

// Date を「YYYY/MM/DD HH:MM」形式の文字列に変換
function formatDatetime(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// モダールに既存イベントを設定
const setupModalData = (modal, data) => {
  const start = modal.querySelector("#start");
  const end = modal.querySelector("#end");
  const name = modal.querySelector("#name");
  const color = modal.querySelector("#color");
  const contact = modal.querySelector("#contact");
  const message = modal.querySelector("#message");

  console.log("setupModalData()", data);
  if (data.event !== undefined) {
    // 既存イベントをクリックした場合
    start.value = convertISOToDatetimeLocal(data.event.startStr);
    end.value = convertISOToDatetimeLocal(data.event.endStr);
    name.value = data.event.title || "";
    color.value = data.event.color || "#000000";
    contact.value = data.event.extendedProps.contact || "";
    message.value = data.event.extendedProps.message || "";
  } else {
    // 空き日を選択した場合は選択範囲の開始・終了だけを入れる
    start.value = convertISOToDatetimeLocal(data.startStr);
    end.value = convertISOToDatetimeLocal(data.endStr);
  }
};

function convertISOToDatetimeLocal(isoString) {
  // ISO8601形式の日付をDateオブジェクトに変換
  const date = new Date(isoString);

  // 年、月、日、時、分を取得
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 月は0から始まるので+1
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // datetime-local形式の文字列を返す
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// リクエストの送信
const sendOffer = (eventData) => {
  return axios
    .post(`/api/offers/${userId}/`, eventData)
    .then((response) => {
      console.log("リクエストを送信しました:", response.data);
      showToast(
        "リクエストを送信しました。承諾されるとカレンダーに表示されます",
        "success"
      );
    })
    .catch((error) => {
      console.error(
        "リクエスト送信エラー:",
        error.response ? error.response.data : error
      );
      showToast("送信に失敗しました。時間をおいて再度お試しください", "error");
    });
};

// 画面上部に数秒だけ表示する通知
let toastTimer = null;
const showToast = (message, type = "success") => {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.className = `toast toast--${type}`;
  toast.innerHTML =
    `<span class="material-icons" aria-hidden="true">` +
    (type === "success" ? "check_circle" : "error") +
    `</span><span class="toast__text"></span>`;
  toast.querySelector(".toast__text").textContent = message;

  clearTimeout(toastTimer);
  requestAnimationFrame(() => toast.classList.add("toast--show"));
  toastTimer = setTimeout(() => toast.classList.remove("toast--show"), 4500);
};
