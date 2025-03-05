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
          const events = response.data.events;
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

const removeAlreadyModal = () => {
  const modal = document.getElementById("modal");
  if (modal) {
    modal.remove();
  }
};

// モーダル登録処理
const registerEditModalEvent = (modal, arg) => {
  const start = modal.querySelector("#start");
  const end = modal.querySelector("#end");
  const name = modal.querySelector("#name");
  const color = modal.querySelector("#color");
  const contact = modal.querySelector("#contact");
  const message = modal.querySelector("#message");

  // 保存
  const saveButton = modal.querySelector("#save");
  if (saveButton) {
    saveButton.addEventListener("click", (e) => {
      e.preventDefault();

      const eventData = {
        start: start.value,
        end: end.value,
        name: name.value,
        color: color.value,
        contact: contact.value,
        message: message.value,
      };
      console.log("送信するイベントデータ: ", userId, eventData);

      if (arg.event !== undefined) {
        // 変更時
        arg.event.setStart(start.value);
        arg.event.setEnd(end.value);
        arg.event.setProp("name", name.value);
        arg.event.setProp("color", color.value);
        arg.event.setExtendedProp("contact", contact.value);
        arg.event.setExtendedProp("message", message.value);
        console.log("if");
        sendEventToServer(arg.event.id, eventData);
      } else {
        // 新規作成時
        const newEvent = calendar.addEvent({
          start: start.value,
          end: end.value,
          name: name.value,
          color: color.value,
          extendedProps: {
            contact: contact.value,
            message: message.value,
          },
        });
        console.log(eventData);
        sendEventToServer(eventData);
      }

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
  const start = modal.querySelector(start);
  const end = modal.querySelector(end);
  const title = modal.querySelector(title);
  const color = modal.querySelector(color);
  const location = modal.querySelector(location);
  const message = modal.querySelector(message);

  console.log("updateToModal()", data);
  if (data !== undefined) {
    console.log("if:", data.event.title); // これは呼べる
    start.value = convertISOToDatetimeLocal(data.event.start);
    end.value = convertISOToDatetimeLocal(data.event.end);
    title.value = data.event.title; // こっちは呼べない
    color.value = data.event.color;
    location.value = data.event.location || "";
    message.value = data.event.extendedProps.message || "";
  } else {
    console.log(data.startStr);
    start.value = convertISOToDatetimeLocal(data.startStr);
  }
};

// モダールに既存イベントを設定
const setupModalData = (modal, data) => {
  const start = modal.querySelector("#start");
  const end = modal.querySelector("#end");
  const name = modal.querySelector("#name");
  const color = modal.querySelector("#color");
  const contact = modal.querySelector("#contact");
  const message = modal.querySelector("#message");

  console.log("setupModalData()", data);
  if (data !== undefined) {
    start.value = convertISOToDatetimeLocal(data.start);
    end.value = convertISOToDatetimeLocal(data.end);
    name.value = data.event.name;
    color.value = data.color;
    contact.value = data.contact;
    message.value = data.message;
  } else {
    console.log(data.startStr);
    start.value = convertISOToDatetimeLocal(data.startStr);
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

// イベント登録リクエストの送信
const sendEventToServer = (eventData) => {
  const url = `/api/offers/${userId}/`;

  console.log("sendEventToServer.eventData: ", eventData);

  const payload = {
    start: eventData.start,
    end: eventData.end,
    name: eventData.name,
    color: eventData.color,
    contact: eventData.contact,
    message: eventData.message,
  };

  const axiosConfig = {
    method: "POST",
    url: url,
    data: payload,
  };

  axios(axiosConfig)
    .then((response) => {
      console.log("イベントが送信されました:", response.data);
    })
    .catch((error) => {
      console.error(
        "イベント送信エラー:",
        error.response ? error.response.data : error
      );
    });
};
