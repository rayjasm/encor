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
      // 祝日(Google カレンダー由来)はクリックしても何もしない
      if (arg.event.url) {
        arg.jsEvent.preventDefault();
        return;
      }
      // リクエスト(オファー)は承諾/辞退用のモーダルを開く
      if (arg.event.extendedProps.type === "offer") {
        initOfferModal(arg);
        return;
      }
      initEditModal(arg);
    },

    /* 予定の表示 */
    eventTimeFormat: {
      hour: "2-digit",
      minute: "2-digit",
      meridiem: false,
    },
    eventSources: [
      /* 日本の祝日 */
      {
        googleCalendarApiKey: "AIzaSyCzakJHMWzQNPxRObFBbgS5Btntz4pcsK8",
        googleCalendarId: "japanese__ja@holiday.calendar.google.com",
      },
      /* 自分の予定 */
      {
        id: "plans",
        events: function (info, successCallback, failureCallback) {
          axios
            .get("/api/plans/")
            .then((response) => {
              const events = response.data.events.map((e) => ({
                id: e.id,
                start: e.start,
                end: e.end,
                title: e.title,
                color: e.color,
                extendedProps: {
                  type: "plan",
                  location: e.location,
                  message: e.message,
                  visibility: e.visibility,
                },
              }));
              successCallback(events);
            })
            .catch((error) => {
              console.error("Error fetching events:", error);
              failureCallback(error);
            });
        },
      },
      /* 届いているリクエスト(未回答のみ) */
      {
        id: "offers",
        events: function (info, successCallback, failureCallback) {
          axios
            .get("/api/offers/")
            .then((response) => {
              const events = response.data.offers.map((o) => ({
                id: `offer-${o.id}`,
                start: o.start,
                end: o.end,
                title: o.title,
                classNames: ["offer-event"],
                editable: false,
                extendedProps: {
                  type: "offer",
                  offerId: o.id,
                  name: o.name,
                  contact: o.contact,
                  message: o.message,
                },
              }));
              successCallback(events);
            })
            .catch((error) => {
              console.error("Error fetching offers:", error);
              failureCallback(error);
            });
        },
      },
    ],
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

/* リクエスト(オファー)の確認モーダル */
const initOfferModal = (data) => {
  removeAlreadyModal();
  const defModal = document.getElementById("offer-modal-template");
  const modal = defModal.cloneNode(true);
  modal.id = "modal";

  setupModalPosition(modal, data.jsEvent);
  document.body.appendChild(modal);

  const event = data.event;
  const props = event.extendedProps;
  modal.querySelector("#offer-name").textContent = props.name || "";
  modal.querySelector("#offer-start").textContent = formatDatetime(event.start);
  modal.querySelector("#offer-end").textContent = formatDatetime(event.end);
  modal.querySelector("#offer-contact").textContent = props.contact || "";
  modal.querySelector("#offer-message").textContent = props.message || "";

  const visibility = modal.querySelector("#offer-visibility");

  // 承諾
  modal.querySelector("#offer-accept").addEventListener("click", (e) => {
    e.preventDefault();
    axios
      .post(`/api/offers/${props.offerId}/accept/`, {
        visibility: visibility.value,
      })
      .then((response) => {
        console.log("リクエストを承諾しました:", response.data);
        modal.remove();
        // オファーが消えて予定が増えるので両方のソースを取り直す
        calendar.refetchEvents();
      })
      .catch((error) => {
        console.error("承諾エラー:", error.response ? error.response.data : error);
        alert("承諾に失敗しました");
      });
  });

  // 辞退
  modal.querySelector("#offer-decline").addEventListener("click", (e) => {
    e.preventDefault();
    if (!confirm("このリクエストを辞退しますか?")) return;
    axios
      .post(`/api/offers/${props.offerId}/decline/`)
      .then((response) => {
        console.log("リクエストを辞退しました:", response.data);
        modal.remove();
        event.remove();
      })
      .catch((error) => {
        console.error("辞退エラー:", error.response ? error.response.data : error);
        alert("辞退に失敗しました");
      });
  });

  // 閉じる
  modal.querySelector("#offer-cancel").addEventListener("click", (e) => {
    e.preventDefault();
    modal.remove();
  });
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
  const visibility = modal.querySelector("#visibility");

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
        visibility: visibility.value,
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
        arg.event.setExtendedProp("visibility", visibility.value);

        updateEventOnServer(arg.event.id, eventData);
      } else {
        // 新規作成時
        const newEvent = calendar.addEvent({
          start: start.value,
          end: end.value,
          title: title.value,
          color: color.value,
          extendedProps: {
            type: "plan",
            location: location.value,
            message: message.value,
            visibility: visibility.value,
          },
        });

        createEventOnServer(newEvent, eventData);
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
  const visibility = modal.querySelector("#visibility");

  if (data.event !== undefined) {
    start.value = convertISOToDatetimeLocal(data.event.startStr);
    end.value = convertISOToDatetimeLocal(data.event.endStr);
    title.value = data.event.title;
    color.value = data.event.color;
    location.value = data.event.extendedProps.location;
    message.value = data.event.extendedProps.message;
    visibility.value = data.event.extendedProps.visibility || "public";
  } else {
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

// 予定の新規登録リクエストを送信
const createEventOnServer = (newEvent, eventData) => {
  axios
    .post("/api/plans/", eventData)
    .then((response) => {
      console.log("イベントが登録されました:", response.data);
      // サーバーが採番したIDを画面上のイベントに反映する(編集・削除に必要)
      newEvent.setProp("id", String(response.data.event_id));
    })
    .catch((error) => {
      console.error("イベント登録エラー:", error);
    });
};

// 予定の更新リクエストを送信
const updateEventOnServer = (eventId, eventData) => {
  axios
    .put("/api/plans/", { id: eventId, ...eventData })
    .then((response) => {
      console.log("イベントが更新されました:", response.data);
    })
    .catch((error) => {
      console.error("イベント更新エラー:", error);
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
        error.response ? error.response.data : error,
        "ID:",
        eventId
      );
    });
};
