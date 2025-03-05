/* CSRF対策 */
axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
axios.defaults.xsrfCookieName = "csrftoken";

let calendar;

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

    /* 日付クリック時 */
    selectable: true,
    unselectAuto: true,
    select: (arg) => {
      initEditModal(arg);
    },
    eventClick: (arg) => {
      console.log(arg);
      initEditModal(arg);
    },

    /* 予定の表示 */
    eventTimeFormat: {
      hour: "2-digit",
      minute: "2-digit",
      meridiem: false,
    },
    events: function (info, successCallback, failureCallback) {
      axios
        .get("/api/plans/")
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

  setupModalData(modal, data);

  registerEditModalEvent(modal, data);
};

const setupModalPosition = (modal, e) => {
  modal.style.display = "flex";
  modal.style.position = "absolute";
  modal.style.zIndex = 9999;

  const position = calcModalPosition(e);
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
  const title = modal.querySelector("#title");
  const color = modal.querySelector("#color");
  const location = modal.querySelector("#location");
  const message = modal.querySelector("#message");

  // 保存
  const saveButton = modal.querySelector("#save");
  if (saveButton) {
    saveButton.addEventListener("click", (e) => {
      e.preventDefault();

      const eventData = {
        start: start.value,
        end: end.value,
        title: title.value,
        color: color.value,
        location: location.value,
        message: message.value,
      };
      console.log("送信するイベントデータ: ", eventData);

      if (arg.event !== undefined) {
        // 変更時
        arg.event.setStart(start.value);
        arg.event.setEnd(end.value);
        arg.event.setProp("title", title.value);
        arg.event.setProp("color", color.value);
        arg.event.setExtendedProp("location", location.value);
        arg.event.setExtendedProp("message", message.value);

        sendEventToServer(arg.event.id, eventData);
      } else {
        // 新規作成時
        const newEvent = calendar.addEvent({
          start: start.value,
          end: end.value,
          title: title.value,
          color: color.value,
          extendedProps: {
            location: location.value,
            message: message.value,
          },
        });

        sendEventToServer(newEvent.id, eventData);
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

  // 削除
  const deleteButton = modal.querySelector("#delete");
  if (deleteButton) {
    deleteButton.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("削除するイベントID:", arg.event.id);
      arg.event.remove();
      calendar.unselect();
      modal.remove();

      sendDeleteRequest(arg.event.id);
    });
  }
};

// モダールに既存イベントを設定
const setupModalData = (modal, data) => {
  const start = modal.querySelector("#start");
  const end = modal.querySelector("#end");
  const title = modal.querySelector("#title");
  const color = modal.querySelector("#color");
  const location = modal.querySelector("#location");
  const message = modal.querySelector("#message");

  console.log(data);
  if (data.event !== undefined) {
    start.value = convertISOToDatetimeLocal(data.event.startStr);
    end.value = convertISOToDatetimeLocal(data.event.endStr);
    title.value = data.event.title;
    color.value = data.event.color;
    location.value = data.event.extendedProps.location;
    message.value = data.event.extendedProps.message;
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
const sendEventToServer = (eventId, eventData, method) => {
  const url = eventId ? `/api/plans/${eventId}/` : "/api/plans/";

  const payload = {
    start: eventData.start,
    end: eventData.end,
    title: eventData.title,
    color: eventData.color,
    location: eventData.location,
    message: eventData.message,
  };

  const axiosConfig = {
    method: eventId ? "PUT" : "POST",
    url: url,
    data: payload,
  };

  axios(axiosConfig)
    .then((response) => {
      console.log("イベントが送信されました:", response.data);
    })
    .catch((error) => {
      console.error("イベント送信エラー:", error);
    });
};

// イベント削除リクエストを送信
const sendDeleteRequest = (eventId) => {
  axios
    .delete(`/api/plans/?event_id=${eventId}`)
    .then((response) => {
      console.log("イベントが削除されました:", response.data);
    })
    .catch((error) => {
      console.error(
        "イベント削除エラー:",
        error.response.data,
        "ID:",
        arg.event.id
      );
    });
};

// イベント削除
const deleteEvent = (event) => {
  event.remove();
  sendDeleteRequest(event.id);
};
