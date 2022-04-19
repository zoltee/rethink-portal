$(async() =>{
    if (!reThinkPage){
        reThinkPage = 'Home';
    }
    let page;
    switch (reThinkPage) {
        default:
        case 'Home':
            page = new HomePage();
            break;
        case 'Authenticate':
            page = new AuthenticatePage();
            break;
        case 'Login':
            page = new LoginPage();
            break;
        case 'Pick Username':
            page = new PickUsernamePage();
            break;
        case 'Select Password':
            page = new SelectPasswordPage();
            break;
        case 'Confirm Email':
            page = new ConfirmEmailPage();
            break;
        case 'Pair Headset':
            page = new PairHeadsetPage();
            break;
        case 'Profile':
            page = new ProfilePage();
            break;
        case 'Avatar':
            page = new AvatarPage();
            break;
    }
    if (page){
        await page.initialize();
    }
});
class Page{
    bcUser;
    constructor() {
        this.bcUser = new BCUser(BCAppId, BCSecret, BCVersion);
    }
    validateEmail(emailInput){
        const email = emailInput.val();
        // if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)){
        if (/^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/.test(email)){
            return true;
        }
        return false;
    }
    validateUsername(usernameInput){
        const username = usernameInput?.val();
        if (/^[a-z0-9_. -]+$/i.test(username)){
            this.bcUser.writeLS('username', username);
            return true;
        }
        this.bcUser.showError('Invalid screen name');
        return false;
    }
    validatePassword(passwordInput){
        const password = passwordInput?.val();
        if (/^\w+$/.test(password)){
            return true;
        }
        this.bcUser.showError('Invalid password');
        return false;
    }

    async initialize(){
        console.log('generic init', this);
        $(document).on('avatarURL',(event, url)=>{
            this.setProfileURL(url);
        })
    }
    async checkLoggedIn(){
        console.log('checking login status');
        const isLoggedIn = this.bcUser.isUserLoggedIn();
        if (isLoggedIn === null){
            console.log('no user info');
            this.redirectToLogin();
        }
        if (isLoggedIn === false){
            console.log('not logged in');
            try {
                await this.bcUser.reconnectUser();
            }catch(e){
                console.log(e);
                this.redirectToLogin();
            }
        }
    }
    redirectToLogin(){
        document.location.href = '/authenticate';
    }
    setProfileURL(url){
        $('.applied-avatar').attr('src', url);
        $('.applied-avatar-bg').css('background-image', url);
    }
}

class HomePage extends Page{
    async initialize(){
        await this.checkLoggedIn();
        $('#logout-link, #logout-button').click(event=>{
            event.preventDefault();
            this.bcUser.logout().then(()=>{
                this.checkLoggedIn();
            });
        });
    }
}
class AuthenticatePage extends Page{
    async initialize(){
        const emailInput = $('#email');
        emailInput.val( this.bcUser.readLS('email') ?? '');
        $('#register-button,#login-button').click(event =>{
            event.preventDefault();
            if (!this.validateEmail(emailInput)){
                this.bcUser.showError('Invalid email address');
            }
            const email = emailInput.val();
            this.bcUser.writeLS('email', email);
            this.bcUser.emailExists(email).then(exists => {
                document.location.href = exists ? '/login' : '/pick-username';
            }).catch(error => {
                this.bcUser.showError(error);
            });
        });

    }
}
class LoginPage extends Page{
    async initialize(){
        const passwordInput = $('#password');
        $('#signin-button').click(event =>{
            event.preventDefault();
            if (this.validatePassword(passwordInput)){
                this.login(this.bcUser.readLS('email'), passwordInput.val());
            }
        });
    }

    login(email, password){
        const $emailForm = $('#email-form').hide();
        const $loading = $('#loading').show();
        this.bcUser.loginUser(email, password, false)
            .then(data => {
                console.log('logged in');
                document.location.href = $('#signin-button').attr('href');
            })
            .catch(error => {
                console.log(error);
                this.bcUser.showError('The email/password you entered was incorrect');
                $loading.hide();
                $emailForm.show();
            });
    }
}
class PickUsernamePage extends Page{
    async initialize(){
        const usernameInput = $('#username');
        usernameInput.val(this.bcUser.user.playerName ?? '');
        $('#next-button').click(event => {
            event.preventDefault();
            if (this.validateUsername(usernameInput)){
                document.location.href = $("#next-button").attr('href');
            }
        });
    }
}
class SelectPasswordPage extends Page{
    async initialize(){
        const passwordInput = $('#password');
        const passwordAgainInput = $('#password-again');
        const email = this.bcUser.readLS('email');
        $('email-address').text(email);
        $('#next-button').click(event => {
            event.preventDefault();
            if (this.validatePassword(passwordInput) && this.comparePasswords(passwordInput, passwordAgainInput)) {
                this.register(email, passwordInput?.val());
            }
        });

    }
    validatePassword(passwordInput){
        const password = passwordInput?.val();
        if (/^\w+$/.test(password)){
            return true;
        }
        this.bcUser.showError("Password invalid");
        return false;
    }
    comparePasswords(passwordInput, passwordAgainInput){
        const password = passwordInput?.val();
        const passwordAgain = passwordAgainInput?.val();
        if (password === passwordAgain){
            return true;
        }
        this.bcUser.showError("Passwords don't match");
        return false;
    }
    async register(email, password){
        const $emailForm = $('#email-form').hide();
        const $loading = $('#loading').show();
        try{
            const data = await this.bcUser.loginUser(email, password, true);
            if(data && data.newUser === "false"){
                if (!this.bcUser.emailVerified){
                    document.location.href = '/confirm-your-email';
                }
                document.location.href = '/';
            } else {
                const username = this.bcUser.readLS('username');
                if (username){
                    await this.bcUser.updateUsername(username);
                }
                document.location.href = $('#next-button').attr('href');
            }
        }catch(error){
                console.log(error);
                this.bcUser.showError('The email/password you entered was incorrect');
                $loading.hide();
                $emailForm.show();
            }
    }
}
class ConfirmEmailPage extends Page{
    async initialize(){
        $('#email-address').text(this.bcUser.readLS('email'));
        $("#next-button").click(event => {
            event.preventDefault();
        });
        this.checkStatus();
    }
    checkStatus(){
        const intervalID = setInterval(() => {
            this.bcUser.readUserData().then(userData => {
                if (userData?.emailVerified){
                    document.location.href = $("#next-button").attr('href');
                }
            });

        }, 1000);
    }
}
class PairHeadsetPage extends Page{
    async initialize(){
        const codeInputs = $('input[name="headset-code[]"]');
        $("#next-button").click(event => {
            if (!this.validateHeadsetCode(codeInputs)) {
                this.bcUser.showError("Invalid headset code");
                event.preventDefault();
            }
        });
        codeInputs.keydown(event => {
            console.log(event);
            const targetId = event.target.id;
            const currentElement = $(event.target);
            const currentIndex = parseInt(targetId.substr(-1));
            if (isNaN(event.key)){
                switch (event.which){
                    case 8: //backspace
                        if(currentElement.val().length > 0){
                            currentElement.val('');
                        }else if(currentIndex > 0){
                            $(`#headset-code-${currentIndex-1}`).focus();
                        }
                        break;
                    case 37: //left arrow
                        if(currentIndex > 0){
                            $(`#headset-code-${currentIndex-1}`).focus();
                        }
                    break;
                    case 39: //right arrow
                        if(currentIndex < 3){
                            $(`#headset-code-${currentIndex+1}`).focus();
                        }
                    break;
                }
            }else{
                if(currentIndex < 3){
                    currentElement.val(event.key);
                    event.preventDefault();
                    $(`#headset-code-${currentIndex+1}`).focus();
                }
            }
        });

    }
    validateHeadsetCode(codeInputs) {
        let code = "";
        for (var i = 0; i < 4; i++) {
            if (codeInputs[i].value.length !== 1) {
                return false;
            }
            code += codeInputs[i].value;
        }
        this.bcUser.writeLS("headset-code", code);
        return true;
    }
}
class ProfilePage extends Page{
    async initialize(){
        await this.checkLoggedIn();
        $('#logout-link, #logout-button').click(event=>{
            event.preventDefault();
            this.bcUser.logout().then(()=>{
                this.checkLoggedIn();
            });
        });
        const findFields = ($element) => {
            const $parent = $element.parents('.profile-field-wrapper');
            const $saveIcon = $parent.find('.profile-save');
            const $editIcon = $parent.find('.profile-edit');
            const $inputField = $parent.find('input[type!=password]');
            const $passwordField = $parent.find('input[type="password"]');
            return {$parent,$saveIcon,$editIcon, $inputField,$passwordField};
        }
        $('.readonly').prop('readonly',true);
        const disableEditing = ($element) => {
            const {$saveIcon,$editIcon, $inputField,$passwordField} = findFields($element);
            $inputField.val($inputField.data('prev-val'));
            $editIcon.show();
            $saveIcon.hide();
            $inputField.off('keydown');
            $inputField
                .addClass('readonly')
                .prop('readonly', true);
            $passwordField.hide();
        };
        const enableEditing = ($element) => {
            const {$saveIcon,$editIcon, $inputField, $passwordField} = findFields($element);
            $editIcon.hide();
            $saveIcon.show();
            $passwordField.show();
            $inputField
                .data('prev-val', $inputField.val())
                .removeClass('readonly')
                .prop('readonly', false)
                .focus();
            $inputField.on('keydown', e=>{
                    if (e.which === 27) {// escape
                        disableEditing($inputField);
                    }
            });
            $saveIcon.click(e=>{
                switch ($inputField.attr('name')){
                    case 'username':
                        if (!this.validateUsername($inputField)){
                            this.bcUser.showError('Invalid screen name');
                            return false;
                        }
                        this.bcUser.updateUsername($inputField.val()).then(()=>{
                            this.bcUser.showSuccess('Screen name updated');
                            $inputField.data('prev-val', $inputField.val());
                            disableEditing($inputField);
                        }).catch((error) =>{
                            console.log(error);
                            this.bcUser.showError('Error saving screen name');
                        });
                        break;
                    case 'firstname':
                        this.bcUser.updateAttributes({firstname:$inputField.val()}).then(()=>{
                            this.bcUser.showSuccess('First Name updated');
                            $inputField.data('prev-val', $inputField.val());
                            disableEditing($inputField);
                        }).catch((error) =>{
                            console.log(error);
                            this.bcUser.showError('Error saving first name');
                        });
                        break;
                    case 'lastname':
                        this.bcUser.updateAttributes({lastname:$inputField.val()}).then(()=>{
                            this.bcUser.showSuccess('Last Name updated');
                            $inputField.data('prev-val', $inputField.val());
                            disableEditing($inputField);
                        }).catch((error) =>{
                            console.log(error);
                            this.bcUser.showError('Error saving last name');
                        });

                        break;
                    case 'email':
                        if (!this.validateEmail($inputField)){
                            this.bcUser.showError('Invalid email address');
                            return false;
                        }
                        if (!this.validatePassword($passwordField)){
                            this.bcUser.showError('Invalid password');
                            return false;
                        }
                        const email = $inputField.val();
                        this.bcUser.updateEmail(email, $passwordField.val()).then(()=>{
                            this.bcUser.showSuccess('Email address updated');
                            $inputField.data('prev-val', email);
                            this.bcUser.writeLS('email', email);
                            disableEditing($inputField);
                            // re-read all the data
                            this.bcUser.reconnectUser();
                        }).catch((error) =>{
                            console.log(error);
                            this.bcUser.showError('Error saving email address. Possibly wrong password');
                        });
                        break;
                }
            });
        }

        this.bcUser.readUser().then(data => {
            $('#email').val(data.emailAddress);
        });


        const username = await this.bcUser.user.playerName;
        $('#username').val(username);
        const firstname = await this.bcUser.readAttribute('firstname');
        $('#firstname').val(firstname);
        const lastname = await this.bcUser.readAttribute('lastname');
        $('#lastname').val(lastname);
        $(".profile-edit").click(event => {
            enableEditing($(event.currentTarget));
        });
    }

}

class AvatarPage extends Page{
    customizer;
    async initialize(){
        await this.checkLoggedIn();
        this.customizer = new AvatarCustomizer();
        this.customizer.initialize({
            glbCallback: this.setGLB.bind(this),
            imageCallback: this.setAvatarURL.bind(this),
        });
        this.loadAvatars();
    }
    loadAvatars(){
        const $swiperWrapper = $('.swiper-wrapper');
        const demoSlides = $swiperWrapper.find('.swiper-slide');
        const template = demoSlides[0].outerHTML;
        demoSlides.remove();
        const avatars = [
            'https://media.sketchfab.com/models/7a8fa15955084fa3bf7103ed1818c584/thumbnails/c092fb3800de440995982870feda61d9/08e1cec1ba8f49ffa44e176ec4fcb368.jpeg',
            'https://cdna.artstation.com/p/assets/images/images/039/558/340/large/wolf3d-andra.jpg?1626256412',
            'https://media.sketchfab.com/models/a9c1f5d2cd7c4ca3bb46272998d3e451/thumbnails/77ef8c5191cb48eb8e1def561dbe72b1/930dc29f6203489fbe51524b24c7cba0.jpeg',
            'https://www.coinkolik.com/wp-content/uploads/2021/12/sanal-platformlar-icin-avatar-projesi-ready-player-me-13-milyon-dolar-yatirim-aldi.jpeg',
            'https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2021/01/readyplayerme-avatar-liv-vr-streaming-238x178.jpg',
            'https://media.sketchfab.com/models/f2791ae3c40c4920a158f96c7dc46f53/thumbnails/1ff36819e8b64a8f831f2c8dbfe6094c/53721a817c5e435b880e0298dc6ea8ce.jpeg'
        ];
        const swiper = new Swiper('.swiper', {
            loop: true,
            slidesPerView: 3,
            spaceBetween: 0,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });
        const urlMatch = new RegExp('src=".*?"','gm');
        for (const avaratURL of avatars) {
            swiper.appendSlide(template.replace(urlMatch, `src="${avaratURL}"`));
        }

    }
    setGLB(glbURL){
        console.log(`Avatar URL: ${glbURL}`);
        this.bcUser.updateAttributes({avatarGLB: glbURL}).then(r => console.log('GLB saved'));
    }
    setAvatarURL(customURL){
        // $('.applied-avatar').attr('src', customURL);
        // $('.applied-avatar-bg').css('background-image', customURL);
        this.setProfileURL(customURL);
        $('#avatar-customizer').remove();
        this.bcUser.setAvatar(customURL).then(url => {
            this.bcUser.showSuccess('Avatar updated');
        });
    }


}

class AvatarCustomizer{
    glbCallback;
    imageCallback;
    constructor(settings) {
        this.glbCallback = settings.glbCallback ?? null;
        this.imageCallback = settings.imageCallback ?? null;
    }
    async initialize(){
        $('#avatar-edit').click(event => {
            const customizer = $('<div id="avatar-customizer"><iframe width="100%" height="100%" id="customizer-frame" src="https://contxtual.readyplayer.me/avatar?frameApi" class="frame" allow="camera *; microphone *"></iframe><b id="customizer-close" style="position: absolute;top: 0;right: 20px;color: #fff;z-index: 1000;padding: 10px;cursor: pointer;">X</b></div>').appendTo('body');
            $(window).on('message', e => {
                this.receiveMessage(e.originalEvent);
            })
            // window.addEventListener('message', this.subscribe);
            // document.addEventListener('message', this.subscribe);
            customizer.show().keydown(e=>{
                if (e.which === 27) {// escape
                    customizer.remove();
                }
            });
            $('#customizer-close').click(e=>{
                customizer.remove();
            });
        });

    }
    async receiveMessage(event) {
        console.log('received event', event);
        function parse(event) {
            try {
                return JSON.parse(event.data);
            } catch (error) {
                return null;
            }
        }
        let eventData;
        if (event.data[0] == '{'){
            eventData = parse(event.data);
            if (eventData?.source !== 'readyplayerme') {
                return;
            }
        }else if(event.data.substring(0,4) === 'http'){
            this.render(event.data);
            return;
        }

        // Subscribe to all events sent from Ready Player Me once frame is ready
        if (eventData.eventName === 'v1.frame.ready') {
            const frame = document.getElementById('customizer-frame');
            frame.contentWindow.postMessage(
                JSON.stringify({
                    target: 'readyplayerme',
                    type: 'subscribe',
                    eventName: 'v1.**'
                }),
                '*'
            );
        }

        // Get avatar GLB URL
        if (eventData.eventName === 'v1.avatar.exported') {
            const glbURL = eventData.data;
            console.log(`Avatar URL: ${eventData.data}`);
            if (this.glbCallback){
                this.glbCallback(glbURL)
            }
            const avatarURL = await this.render(glbURL);
            if (this.imageCallback){
                this.imageCallback(avatarURL)
            }
            return;
        }

        // Get user id
        if (eventData.eventName === 'v1.user.set') {
            console.log(`User with id ${eventData.data.id} set: ${JSON.stringify(eventData)}`);
        }
    }
    async render(glbURL){
        const params =
            {
                model: glbURL,
                scene: "halfbody-portrait-v1-transparent", //halfbody-portrait-v1, fullbody-portrait-v1 ,halfbody-portrait-v1-transparent , fullbody-portrait-v1-transparent , fullbody-posture-v1-transparent
                // armature: "ArmatureTargetMale", // ArmatureTargetFemale
            }
        return $.ajax({
            url:'https://render.readyplayer.me/render',
            method: "POST",
            contentType:'application/json',
            data: JSON.stringify(params),
            dataType: 'json'
        }).done(data=>{
            console.log(data);
            return data.renders[0];
        });
    }
}
