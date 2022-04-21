var bcUser = new BCUser(BCAppId, BCSecret, BCVersion);
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
    async initialize(){
        console.log('generic init', this);
        $(document).on('avatarURL',(event, url)=>{
            this.setProfileURL(url);
        })
    }
    setProfileURL(url){
        $('.applied-avatar').attr('src', url);
        $('.applied-avatar-bg').css('background-image', url);
    }
}

class HomePage extends Page{
    async initialize(){
        await Utils.checkLoggedIn();
        $('#logout-link, #logout-button').click(event=>{
            event.preventDefault();
            bcUser.logout().then(()=>{
                Utils.redirectToLogin();
            });
        });
    }
}
class AuthenticatePage extends Page{
    $emailInput;
    initialize(){
        const emailLogin = new EmailPasswordLogin();
        this.$emailInput = $('#email');
        emailLogin.initialize({
            $emailInput,
            loginCallback: this.emailLoginCallback.bind(this)
        });
     /*   this.$emailInput.val( Utils.readLS('email') ?? '');
        $('#register-button').click(this.handleNext.bind(this));
        this.$emailInput.on('keydown', (event => {
            if (event.which === 13){
                this.handleNext(event);
            }
        }));*/
        const googleLogin = new GoogleLogin();
        googleLogin.initialize({
            loginCallback:this.googleLoginCallback.bind(this)
        });
        const facebookLogin = new FacebookLogin();
        facebookLogin.initialize({
            loginCallback:this.fbLoginCallback.bind(this)
        });
    }
    emailLoginCallback(exists){
        document.location.href = exists ? '/login' : '/pick-username';
    }
    googleLoginCallback(responsePayload){
        bcUser.loginGoogle(responsePayload.sub, responsePayload.jti, true).then(data => {
            console.log('G logged in', data);

            // document.location.href = $('#signin-button').attr('href');

        }).catch(error => {
            console.log(error);
            Utils.showError('The email/password you entered was incorrect');
        });

    }
    fbLoginCallback(authResponse){
        bcUser.loginFacebook(authResponse.userID, authResponse.accessToken, true).then(data => {
            console.log('FB logged in', data);
            // document.location.href = $('#signin-button').attr('href');

        }).catch(error => {
            console.log(error);
            Utils.showError('The email/password you entered was incorrect');
        });

    }
}
class LoginPage extends Page{
    $passwordInput;
    async initialize(){
        this.$passwordInput = $('#password');
        $('#signin-button').click(this.handleNext.bind(this));
        this.$passwordInput.on('keydown', (event => {
            if (event.which === 13){
                this.handleNext(event);
            }
        }));
    }
    handleNext(event){
        event.preventDefault();
        if (Utils.validatePassword(this.$passwordInput)){
            this.login(Utils.readLS('email'), this.$passwordInput.val());
        }

    }
    login(email, password){
        const $emailForm = $('#email-form').hide();
        const $loading = $('#loading').show();
        bcUser.loginUser(email, password, false)
            .then(data => {
                console.log('logged in');
                document.location.href = $('#signin-button').attr('href');
            })
            .catch(error => {
                console.log(error);
                Utils.showError('The email/password you entered was incorrect');
                $loading.hide();
                $emailForm.show();
            });
    }
}
class PickUsernamePage extends Page{
    $usernameInput;
    async initialize(){
        const usernameInput = $('#username');
        this.$usernameInput.val(bcUser.user.playerName ?? '');
        $('#next-button').click(this.handleNext.bind(this));
        this.$passwordInput.on('keydown', (event => {
            if (event.which === 13){
                this.handleNext(event);
            }
        }));

    }
    handleNext(event){
        event.preventDefault();
        if (Utils.validateUsername(usernameInput)){
            document.location.href = $("#next-button").attr('href');
        }
    }

}
class SelectPasswordPage extends Page{
    $passwordInput;
    $passwordAgainInput
    async initialize(){
        this.$passwordInput = $('#password');
        this.$passwordAgainInput = $('#password-again');
        const email = Utils.readLS('email');
        $('email-address').text(email);
        $('#next-button').click(this.handleNext.bind(this));
        this.$passwordInput.on('keydown', (event => {
            if (event.which === 13){
                this.handleNext(event);
            }
        }));
        this.$passwordAgainInput.on('keydown', (event => {
            if (event.which === 13){
                this.handleNext(event);
            }
        }));
    }
    handleNext(event){
        event.preventDefault();
        const email = Utils.readLS('email');
        if (Utils.validatePassword(this.$passwordInput) && Utils.comparePasswords(this.$passwordInput, this.$passwordAgainInput)) {
            this.register(email, this.$passwordInput?.val());
        }
    }

    async register(email, password){
        const $emailForm = $('#email-form').hide();
        const $loading = $('#loading').show();
        try{
            const data = await bcUser.loginUser(email, password, true);
            if(data && data.newUser === "false"){
                if (!bcUser.user.emailVerified){
                    document.location.href = '/confirm-your-email';
                }
                document.location.href = '/';
            } else {
                const username = Utils.readLS('username');
                if (username){
                    await bcUser.updateUsername(username);
                }
                document.location.href = $('#next-button').attr('href');
            }
        }catch(error){
                console.log(error);
                Utils.showError('The email/password you entered was incorrect');
                $loading.hide();
                $emailForm.show();
            }
    }
}
class ConfirmEmailPage extends Page{
    async initialize(){
        $('#email-address').text(Utils.readLS('email'));
        $("#next-button").click(event => {
            event.preventDefault();
        });
        this.checkStatus();
    }
    checkStatus(){
        const intervalID = setInterval(() => {
            bcUser.readUserData().then(userData => {
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
                Utils.showError("Invalid headset code");
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
                    case 13:
                        event.preventDefault();
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
        Utils.writeLS("headset-code", code);
        return true;
    }
}
class ProfilePage extends Page{
    async initialize(){
        await Utils.checkLoggedIn();
        $('#logout-link, #logout-button').click(event=>{
            event.preventDefault();
            bcUser.logout().then(()=>{
                 Utils.redirectToLogin();
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
                        if (!Utils.validateUsername($inputField)){
                            Utils.showError('Invalid screen name');
                            return false;
                        }
                        bcUser.updateUsername($inputField.val()).then(()=>{
                            Utils.showSuccess('Screen name updated');
                            $inputField.data('prev-val', $inputField.val());
                            disableEditing($inputField);
                        }).catch((error) =>{
                            console.log(error);
                            Utils.showError('Error saving screen name');
                        });
                        break;
                    case 'firstname':
                        bcUser.updateAttributes({firstname:$inputField.val()}).then(()=>{
                            Utils.showSuccess('First Name updated');
                            $inputField.data('prev-val', $inputField.val());
                            disableEditing($inputField);
                        }).catch((error) =>{
                            console.log(error);
                            Utils.showError('Error saving first name');
                        });
                        break;
                    case 'lastname':
                        bcUser.updateAttributes({lastname:$inputField.val()}).then(()=>{
                            Utils.showSuccess('Last Name updated');
                            $inputField.data('prev-val', $inputField.val());
                            disableEditing($inputField);
                        }).catch((error) =>{
                            console.log(error);
                            Utils.showError('Error saving last name');
                        });

                        break;
                    case 'email':
                        if (!Utils.validateEmail($inputField)){
                            Utils.showError('Invalid email address');
                            return false;
                        }
                        if (!Utils.validatePassword($passwordField)){
                            Utils.showError('Invalid password');
                            return false;
                        }
                        const email = $inputField.val();
                        bcUser.updateEmail(email, $passwordField.val()).then(()=>{
                            Utils.showSuccess('Email address updated');
                            $inputField.data('prev-val', email);
                            Utils.writeLS('email', email);
                            disableEditing($inputField);
                            // re-read all the data
                            bcUser.reconnectUser();
                        }).catch((error) =>{
                            console.log(error);
                            Utils.showError('Error saving email address. Possibly wrong password');
                        });
                        break;
                }
            });
        }

        bcUser.readUser().then(data => {
            $('#email').val(data.emailAddress);
        });


        const username = await bcUser.user.playerName;
        $('#username').val(username);
        const firstname = await bcUser.readAttribute('firstname');
        $('#firstname').val(firstname);
        const lastname = await bcUser.readAttribute('lastname');
        $('#lastname').val(lastname);
        $(".profile-edit").click(event => {
            enableEditing($(event.currentTarget));
        });
    }

}
class AvatarPage extends Page{
    async initialize(){
        await Utils.checkLoggedIn();
        const customizer = new AvatarCustomizer();
        customizer.initialize({
            glbCallback: this.setGLB.bind(this),
            imageCallback: this.setAvatarURL.bind(this),
        }).then(()=>{
            console.log('Customizer loaded');
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
        bcUser.updateAttributes({avatarGLB: glbURL}).then(r => console.log('GLB saved'));
    }
    setAvatarURL(customURL){
        // $('.applied-avatar').attr('src', customURL);
        // $('.applied-avatar-bg').css('background-image', customURL);
        this.setProfileURL(customURL);
        $('#avatar-customizer').remove();
        bcUser.setAvatar(customURL).then(url => {
            Utils.showSuccess('Avatar updated');
        });
    }


}

class AvatarCustomizer{
    glbCallback;
    imageCallback;
    async initialize(settings){
        this.glbCallback = settings.glbCallback ?? null;
        this.imageCallback = settings.imageCallback ?? null;
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

class EmailPasswordLogin{
    settings;
    initialize(settings){
        this.settings = settings;
        console.log('initializing email/password login');
        this.settings.$emailInput.val(Utils.readLS('email') ?? '');
        $('#register-button').click(this.handleNext.bind(this));
        this.settings.$emailInput.on('keydown', (event => {
            if (event.which === 13){
                this.handleNext(event);
            }
        }));
    }
    handleNext(event){
        event.preventDefault();
        if (!Utils.validateEmail(this.$emailInput)){
            Utils.showError('Invalid email address');
            return;
        }
        const email = this.$emailInput.val();
        Utils.writeLS('email', email);
        sett
        bcUser.emailExists(email).then(exists => {
            setting.loginCallback(exists);
        }).catch(error => {
            Utils.showError(error);
        });
    }

}
class GoogleLogin{
    settings
    initialize(settings){
        this.settings = settings;
        console.log('initializing google');
        $.getScript('https://accounts.google.com/gsi/client', ()=>{
            console.log('google script loaded');
            google.accounts.id.initialize({
                client_id: "930957171392-4471lakpcubvjidtho0vsoqqhggonl1k.apps.googleusercontent.com",
                callback: this.handleCredentialResponse.bind(this)
            });
            $('#google-login').click(event => {
                google.accounts.id.prompt(notification => {// display the One Tap dialog
                    console.log('google popup notification', notification);
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        console.log('Can`t display google login popup');
                    }
                });
            });
        });

    }
    handleCredentialResponse(response){
        console.log("Encoded JWT ID token: " + response.credential);
        // decodeJwtResponse() is a custom function defined by you
        // to decode the credential response.
        const responsePayload = this.decodeJwtResponse(response.credential);
        console.log("decoded response", responsePayload);
        console.log("ID: " + responsePayload.sub);
        console.log('Full Name: ' + responsePayload.name);
        console.log('Given Name: ' + responsePayload.given_name);
        console.log('Family Name: ' + responsePayload.family_name);
        console.log("Image URL: " + responsePayload.picture);
        console.log("Email: " + responsePayload.email);

        this.settings.loginCallback(responsePayload);
    }
    decodeJwtResponse(token) {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    };
}

class FacebookLogin{
    settings
    initialize(settings) {
        this.settings = settings;
        console.log('initializing facebook');
        // $('#facebook-login').prop('disabled', true);
        /*FB.login(function(response) {
            if (response.status === 'connected') {
                // Logged into your webpage and Facebook.
            } else {
                // The person is not logged into your webpage or we are unable to tell.
            }
        }, {scope: 'public_profile,email'});*/
        $.getScript('https://connect.facebook.net/en_US/sdk.js', ()=>{
            console.log('facebook script loaded');
            FB.init({
                appId: '950178832349000',
                version: 'v2.7' // or v2.1, v2.2, v2.3, ...
            });
            // $('#facebook-login').removeAttr('disabled');
            FB.getLoginStatus(this.statusChangeCallback.bind(this));
        });
    }
    statusChangeCallback(response) {  // Called with the results from FB.getLoginStatus().
        console.log('statusChangeCallback');
        console.log(response);                   // The current login status of the person.
        if (response.status === 'connected') {   // Logged into your webpage and Facebook.
            this.handleCallback(response.authResponse);
        } else {                                 // Not logged into your webpage or we are unable to tell.
            $('#facebook-login').click(event=>{
                this.showLogin();
            });

            console.log('FB login ready.');
        }
    }
    handleCallback(authResponse) {                      // Testing Graph API after login.  See statusChangeCallback() for when this call is made.
        console.log('Welcome!  Fetching your information.... ');
        this.settings.loginCallback(authResponse);
        FB.api('/me', response => {
            console.log('get info from FB',response);
            console.log('Successful login for: ' + response.name);
            console.log('Thanks for logging in, ' + response.name + '!');
           //  this.login(response);
        });
    }
    showLogin(){
        FB.login(this.statusChangeCallback.bind(this), {scope: 'email,public_profile'});
    }

    logout(){
        FB.logout(function(response) {
            // Person is now logged out
        });
    }
}