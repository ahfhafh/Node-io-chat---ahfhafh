/* Based on socket io chat app code template */
var socket = io("localhost:3000");

var input_nickname = document.getElementById('input_nickname');
var input_color = document.getElementById('input_color');
var messages = document.getElementById('messages');
var chat_form = document.getElementById('chat_form');
var chat_input = document.getElementById('chat_input');
var display_users = document.getElementById('users');
let users_sidebar = document.getElementsByClassName("col-4");

var welcome_form_modal = document.getElementById("welcome_form_modal");
var welcome_form = document.getElementById("welcome_form");
var modal_show = document.getElementById("change_nickn");
var modal_close = document.getElementsByClassName("close_btn")[0];

var nickname = "default_nickname";
var color = "#b36b97";

const chat_users = [];

// when a user connects (to chat not server)
socket.on('user_connection', (nn) => {
    console.log(nn + " has joined")
    user_notification(nn + " has joined");
})

// when a user disconnects
socket.on('user_disconnect', (nn) => {
    // don't show if user hasn't connected and picked username yet
    if (nn !== "default_nickname") {
        console.log(nn + " has left");
        user_notification(nn + " has left");
    }
    removeUser(nn);
})

// set nickname and color
welcome_form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input_nickname.value) {
        if (chat_users.includes(input_nickname.value)) {
            console.log("Nickname already taken");
            user_notification("Nickname already taken");
            return;
        } else if (input_nickname.value.length > 25) {
            console.log("Nickname too long");
            user_notification("Nickname too long");
            return;
        } else if (input_nickname.value.trim().length === 0) {
            console.log("Input valid nickname");
            user_notification("Input valid nickname");
            return;
        }
        nickname = input_nickname.value;
        input_nickname.value = '';
    } else if (input_nickname.value === '') {
        //receive random nickname
        socket.on('random_nn', (nn) => {
            nickname = nn;
        })
    }
    color = input_color.value;
    chat_users.push(nickname);
    socket.emit('set_name_color', nickname, color, 0);
    welcome_form_modal.style.display = "none";
})

// user leaves
modal_show.onclick = () => {
    welcome_form_modal.style.display = "block";
    const i = chat_users.indexOf(nickname);
    if (i > -1) {
        chat_users.splice(i, 1);
    }
    nickname = "default_nickname";
    socket.emit('user_disconnect');
}

// user connects after chosing nickname
modal_close.onclick = () => {
    if (nickname === "default_nickname") {
        console.log("Please choose a nickname");
        user_notification("Please choose a nickname");
    } else {
        welcome_form_modal.style.display = "none";
    }
}

// add user to existing users list
socket.on('add_user', (nn) => {
    chat_users.push(nn);
    let user_item = document.createElement('li');
    user_item.textContent = nn;
    if (nickname === nn) {
        user_item.style.backgroundColor = "rgba(0, 0, 0, 0.25)";
    }
    users.appendChild(user_item);
})

// submit chat message
chat_form.addEventListener('submit', (e) => {
    e.preventDefault();
    // if chat message is a /nick command
    if (chat_input.value.includes("/nick ")) {
        let newnickname = chat_input.value.substring(6);
        if (chat_users.includes(newnickname)) {
            console.log("Nickname already taken");
            user_notification("Nickname already taken");
            return;
        } else if (newnickname > 25) {
            console.log("Nickname too long");
            user_notification("Nickname too long");
            return;
        } else if (newnickname.trim().length === 0) {
            console.log("Input valid nickname");
            user_notification("Input valid nickname");
            return;
        }
        chat_input.value = '';
        nickname = newnickname;
        chat_users.push(nickname);
        socket.emit('set_name_color', nickname, color, 1);
        return;
    }
    // if chat message is a /nickcolor command
    if (chat_input.value.includes("/nickcolor ")) {
        let newcolor = chat_input.value.substring(11);
        if (!isColor(newcolor)) {
            console.log(newcolor)
            console.log("Command format: /nickcolor <RRGGBB>");
            user_notification("Command format: /nickcolor <RRGGBB>");
            return;
        }
        chat_input.value = '';
        color = newcolor;
        socket.emit('set_name_color', nickname, color, 2);
    }
    if (chat_input.value) {
        socket.emit('chat message', chat_input.value);
        chat_input.value = '';
    }
});

// https://stackoverflow.com/questions/48484767/javascript-check-if-string-is-valid-css-color
const isColor = (str) => {
    const s = new Option().style;
    s.color = str;
    return s.color !== '';
}

// a user changes their nickname, change existing messages nicknames too
socket.on('nn_change', (old_nn, new_nn) => {
    removeUser(old_nn);

    const allMessages = document.querySelectorAll("#messages > li");
    allMessages.forEach((m) => {
        if (m.childNodes[0].innerText === old_nn) {
            m.childNodes[0].innerText = new_nn;
        }
    })
})

// a user changes their color, change existing messages colors too
socket.on('c_change', (nn, new_c) => {
    const allMessages = document.querySelectorAll("#messages > li");
    allMessages.forEach((m) => {
        if (m.childNodes[0].innerText === nn) {
            let p = m.childNodes[1].getElementsByTagName("P");
            p[0].style.backgroundColor = new_c;
        }
    })
})

// receive chat message
socket.on('chat message', (msg) => {
    let msg_item = document.createElement('li');
    let msg_name = document.createElement('div');
    let msg_textntime = document.createElement('div');
    let msg_text = document.createElement('p');
    let msg_time = document.createElement('span');
    let time = new Date(msg.time);
    msg_name.textContent = msg.nickname;
    msg_text.textContent = msg.text;
    msg_time.textContent = (time.getHours()<10?'0':'') + time.getHours() + ":" + 
        (time.getMinutes()<10?'0':'') + time.getMinutes();
    if (msg.nickname === nickname) {    // current client sending
        // make it right aligned and shift timestamp to left of message
        msg_item.style.cssText = 'float: right; margin-right: 16px; align-self: flex-end;';
        msg_name.style.cssText = 'float: right; margin-right: 16px;';
        msg_time.style.cssText = 'margin-right: 5px;'
        msg_text.style.cssText = 'background:'+msg.color + '; font-weight: bold;';
        msg_textntime.style.cssText = 'clear:right;'

        msg_textntime.appendChild(msg_time);
        msg_textntime.appendChild(msg_text);
        msg_item.appendChild(msg_name);
        msg_item.appendChild(msg_textntime);
    } else {    // other users sending
        // make it left aligned and shift timestamp to right of message
        msg_name.style.cssText = 'margin-left: 16px;';
        msg_text.style.cssText = 'background:'+msg.color;
        msg_time.style.cssText = 'margin-left: 5px;'

        msg_textntime.appendChild(msg_text);
        msg_textntime.appendChild(msg_time);
        msg_item.appendChild(msg_name);
        msg_item.appendChild(msg_textntime);
    }
    messages.prepend(msg_item);
    messages.scrollTop = messages.scrollHeight;
});

// load chat history
socket.on('load_chat_history', (chat_log) => {
    chat_log.forEach( (e) => {
        let msg_item = document.createElement('li');
        let msg_name = document.createElement('div');
        let msg_textntime = document.createElement('div');
        let msg_text = document.createElement('p');
        let msg_time = document.createElement('span');

        msg_text.style.cssText = 'background: ' + e.color;
        msg_name.style.cssText = 'margin-left: 16px;';
        msg_time.style.cssText = 'margin-left: 5px;'

        let time = new Date(e.time);
        msg_name.textContent = e.nickname;
        msg_text.textContent = e.text;
        msg_time.textContent = (time.getHours()<10?'0':'') + time.getHours() + ":" + 
            (time.getMinutes()<10?'0':'') + time.getMinutes();
        msg_textntime.appendChild(msg_text);
        msg_textntime.appendChild(msg_time);
        msg_item.appendChild(msg_name);
        msg_item.appendChild(msg_textntime);
        messages.appendChild(msg_item);  
        messages.scrollTop = messages.scrollHeight; 
    });
})

// load chat users
socket.on('load_chat_users', (users) => {
    users.forEach( (e) => {
        chat_users.push(e);
        let user_item = document.createElement('li');
        user_item.textContent = e;
        display_users.appendChild(user_item);
    })
})

// https://www.w3schools.com/howto/howto_js_snackbar.asp
function user_notification(message) {
    var x = document.getElementById("snackbar");
    x.textContent = message;

    x.className = "show";
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}

// show/hide users when button is clicked on mobile displays 
function show_users() {
    if (users_sidebar[0].style.display === "none") {
        users_sidebar[0].style.display = "block";
        users_sidebar[0].style.position = "absolute";

        chat_form.style.display = "none";
    } else {
        users_sidebar[0].style.display = "none";

        chat_form.style.display = "flex";
    }
}

// set to default state when changing between mobile and desktop
window.addEventListener('resize', function() {
    if (this.window.innerWidth > 768) {
        users_sidebar[0].style.display = "block";
        users_sidebar[0].style.position = "absolute";
        chat_form.style.display = "flex";
    }

    if (this.window.innerWidth <= 768) {
        users_sidebar[0].style.display = "none";
        chat_form.style.display = "flex";
    }
});

// removes nickname from displayed list and chat_users list
function removeUser(nn) {
     // remove user from list of users
     const i = chat_users.indexOf(nn);
     if (i > -1) {
         chat_users.splice(i, 1);
     }
     // remove user from displayed users
     var user_items = document.evaluate("//li[contains(text(),'"+nn+"')]", 
         document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
     if (user_items !== null) {
         user_items.remove();
     }
}
