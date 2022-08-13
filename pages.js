var bcUser = new BCUser(BCAppId, BCSecret, BCVersion, BCApiUrl);
$(async() =>{
    if (!reThinkPage){
        reThinkPage = 'Home';
    }
    let page;
    switch (reThinkPage) {
        default:
        case 'Welcome':
            page = new WelcomePage();
        break;
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
}

class WelcomePage extends Page{
    async initialize(){
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
            $emailInput: this.$emailInput,
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
    getNextURL(){
        if(!bcUser.userData.playerName){
            document.location.href =`/${SLUGS['pick-username']}`;
        }

    }

    emailLoginCallback(exists){
        document.location.href = exists ? `/${SLUGS['login']}` : `/${SLUGS['pick-username']}`;
    }
    googleLoginCallback(profileData){
        bcUser.loginGoogle(profileData.email, profileData.id_token, true).then(data => {
            console.log('G logged in', data);
            if(data && data.newUser === "false"){
                document.location.href = `/${SLUGS['dashboard']}`;
            }else {
                document.location.href = `/${SLUGS['pair-headset']}`;
            }

        }).catch(error => {
            console.log(error);
            Utils.showError('The google account you selected didn\'t work');
        });

    }
    fbLoginCallback(authResponse){
        bcUser.loginFacebook(authResponse.userID, authResponse.accessToken, true).then(data => {
            console.log('FB logged in', data);
            if(data && data.newUser === "false"){
                document.location.href = `/${SLUGS['dashboard']}`;
            }else {
                document.location.href = `/${SLUGS['pair-headset']}`;
            }

        }).catch(error => {
            console.log(error);
            Utils.showError('The facebook account you selected didn\'t work');
        });

    }
}
class LoginPage extends Page{
    $passwordInput;
    async initialize(){
        $('#email-address').text(Utils.readLS('email'));
        this.$passwordInput = $('#password');
        $('#signin-button').click(this.handleNext.bind(this));

        this.$passwordInput.on('keydown', (event => {
            if (event.which === 13){
                this.handleNext(event);
            }
        }));
        $("#reset-password-button").click(event => {
            event.preventDefault();
            bcUser.resetPassword(Utils.readLS('email')).then(res => {
                Utils.showSuccess('Change password email sent');
                $.modal.close();
            });
        });
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
                if (error === Utils.EMAIL_VERIFY_MESSAGE){ // email not verified
                    document.location.href = `/${SLUGS['confirm-your-email']}`;
                }
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
        this.$usernameInput = $('#username');
        this.$usernameInput.val(bcUser.userData?.playerName ?? '');
        $('#next-button').click(this.handleNext.bind(this));
        this.$usernameInput.on('keydown', (event => {
            if (event.which === 13){
                this.handleNext(event);
            }
        }));

    }
    handleNext(event){
        event.preventDefault();
        if (Utils.validateUsername(this.$usernameInput)){
            document.location.href = $("#next-button").attr('href');
        }else{
            Utils.showError('Please specify a screen name to continue');
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
        $('#email-address').text(email);
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
                if (!bcUser.userData.emailVerified){
                    document.location.href = `/${SLUGS['confirm-your-email']}`;
                }
                document.location.href = `/${SLUGS['dashboard']}`;
            } else {
                const username = Utils.readLS('username');
                if (username){
                    await bcUser.updateUsername(username);
                }
                document.location.href = $('#next-button').attr('href');
            }
        }catch(error){
            if (error === Utils.EMAIL_VERIFY_MESSAGE){
                document.location.href = `/${SLUGS['confirm-your-email']}`;
            }

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
        // await Utils.checkLoggedIn();
        $("#next-button").click(event => {
            event.preventDefault();
        });
        $("#resend-code-button").click(event => {
            event.preventDefault();
            bcUser.resendEmailVerification().then(res => {
                Utils.showSuccess('Email verification code resent');
                $.modal.close();
            });
        });
        $("#change-email-button").click(event => {
            event.preventDefault();
            bcUser.updateEmail($('#email').val(), $('#password').val()).then(res => {
                Utils.showSuccess('Email changed');
                $.modal.close();
            });
        });

        this.checkStatus();
    }
    checkStatus(){
        const intervalID = setInterval(() => {
           // bcUser.readUserData().then(userData => {
            bcUser.checkEmailVerified().then(verified => {
                if (verified){
                    document.location.href = $("#next-button").attr('href');
                }
                console.log('email not verified');
            });
        }, 1000);
    }
}
class PairHeadsetPage extends Page{
    async initialize(){
        await Utils.checkLoggedIn();
        const codeInputs = $('input[name="headset-code[]"]');
        const $nextButton = $("#next-button");
        $nextButton.click(async event => {
            event.preventDefault();
            if (!(await this.validateHeadsetCode(codeInputs))) {
                Utils.showError("Invalid headset code");
                return;
            }
            document.location.href = $nextButton.attr('href');
        });
        codeInputs.keydown(event => {
            // console.log(event);
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
        codeInputs.on('paste', event => {
            event.preventDefault();
            const content = event.originalEvent.clipboardData.getData('text/plain');
            for (var i = 0; i < Math.min(4, content.length); i++) {
                codeInputs[i].value = content[i];
            }
        });

    }
    async validateHeadsetCode(codeInputs) {
        let code = "";
        for (var i = 0; i < 4; i++) {
            if (codeInputs[i].value.length !== 1) {
                return false;
            }
            code += codeInputs[i].value;
        }
        Utils.writeLS("headset-code", code);
        return await bcUser.verifyHeadsetCode(code) !== false;
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
                    if (e.which === 13) {// enter
                        saveField()
                    }
            });
            $saveIcon.click(e=>{
                saveField();
            });

            var saveField = ()=>{
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
            };
        }


        bcUser.readUser().then(data => {
            $('#email').val(data.emailAddress);
        });


        const username = await bcUser.userData.playerName;
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
    swiper;
    async initialize(){
        await Utils.checkLoggedIn();
        $('#next-button').click(this.handleNext.bind(this));
        this.initSwiper();
        const customizer = new AvatarCustomizer();
        customizer.initialize({
            glbCallback: this.setGLB.bind(this),
            imageCallback: this.setAvatarURL.bind(this),
        }).then(()=>{
            console.log('Customizer loaded');
        });
    }
    initSwiper(){
        this.swiper = new Swiper('.swiper', {
            loop: true,
            slidesPerView: 3,
            spaceBetween: 0,
            mousewheel: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            keyboard: {
                enabled: true,
                onlyInViewport: false,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });

        const $swiperWrapper = $('.swiper-wrapper');
        const selectedIndex = this.markSelectedAvatar($swiperWrapper);
        if (selectedIndex !== null){
            this.swiper.slideToLoop(Math.max(selectedIndex - 1, 0), 500, false);
        }
        $swiperWrapper.on('click', '.swiper-slide',event => {
            event.preventDefault();
            const $avatarWrapper = $(event.currentTarget);
            this.setAvatarURL($avatarWrapper.find('.sample-avatar').attr('src'), false);
            this.setGLB('');
        });
        $('#custom-avatar').click(event => {
            this.setAvatarURL(event.currentTarget.src, true);
        })
    }
    markSelectedAvatar($swiperWrapper){
        let selectedIndex = null;
        $swiperWrapper.find('.swiper-slide .sample-avatar').each((index, element) => {
            // avatarURLs.push(element.src);
            if (bcUser.userData.pictureUrl === element.src){
                const $currentSlide = $(element);
                selectedIndex = $currentSlide
                    .parent('.swiper-slide')
                    .addClass("selected")
                    .data('swiper-slide-index');
                console.log('found matching avatar',selectedIndex);
                console.log(this.swiper);
            }
        });
        if (selectedIndex === null){
            bcUser.readAttribute('avatarGLB').then(hasGLB =>{
                $('.custom-avatar-container').toggleClass('selected',hasGLB);
            });

        }
        return selectedIndex;
    }

    setGLB(glbURL){
        console.log(`Avatar GLB URL: ${glbURL}`);
        bcUser.updateAttributes({avatarGLB: glbURL}).then(r => console.log('GLB saved'));
    }
    setAvatarURL(URL, customized = false){
        // $('.applied-avatar').attr('src', customURL);
        // $('.applied-avatar-bg').css('background-image', customURL);
        // this.setProfileURL(URL, customized);
        $('#avatar-customizer').remove();
        $('.swiper-wrapper .swiper-slide.selected, .custom-avatar-container.selected').removeClass('selected');
        bcUser.setAvatar(URL, customized).then(url => {
            Utils.showSuccess('Avatar updated');
        }).then(()=>{
            if (customized){
                $('.custom-avatar-container').addClass('selected');
            }else{
                this.markSelectedAvatar($('.swiper-wrapper'));
            }
        });
    }
    handleNext(event){
        event.preventDefault();
        if (bcUser.isUserLoggedIn()){
            document.location.href = `/${SLUGS['profile']}`;
        }else{
            document.location.href = $('#next-button').attr('href');
        }
    }

}

class AvatarCustomizer{
    glbCallback;
    imageCallback;
    async initialize(settings){
        this.glbCallback = settings.glbCallback ?? null;
        this.imageCallback = settings.imageCallback ?? null;
        $('#avatar-edit').click(event => {
            const customizer = $('<div id="avatar-customizer"><iframe width="90%" height="90%" id="customizer-frame" src="https://contxtual.readyplayer.me/avatar?frameApi" class="frame" allow="camera *; microphone *"></iframe><b id="customizer-close" style="position: absolute;top: 0;right: 20px;color: #ce3391;z-index: 1000;padding: 10px;cursor: pointer;">X</b></div>').appendTo('body');
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
        let eventData;
        if (event.data[0] === '{'){
            eventData = Utils.parseJSON(event.data);
            if (eventData?.source !== 'readyplayerme') {
                return;
            }
        }
        // Get avatar GLB URL
        if(event.data.substring(0,4) === 'http' || eventData.eventName === 'v1.avatar.exported'){
            const glbURL = eventData?.data ?? event.data;
            console.log(`Avatar URL: ${glbURL}`);
            if (this.glbCallback){
                this.glbCallback(glbURL)
            }
            const avatarURL = await this.render(glbURL);
            if (this.imageCallback){
                this.imageCallback(avatarURL, true)
            }
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
        return new Promise((resolve, reject) => {
            $.ajax({
                url:'https://render.readyplayer.me/render',
                method: "POST",
                contentType:'application/json',
                data: JSON.stringify(params),
                dataType: 'json'
            }).done(data=>{
                console.log(data);
                resolve(data.renders[0]);
            }).fail(error => {
              reject(error);
            });
        })
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
        if (!Utils.validateEmail(this.settings.$emailInput)){
            Utils.showError('Invalid email address');
            return;
        }
        const email = this.settings.$emailInput.val();
        Utils.writeLS('email', email);

        bcUser.emailExists(email).then(exists => {
            this.settings.loginCallback(exists);
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
        $('#google-login').click(event => {
            $.getScript('https://apis.google.com/js/platform.js', ()=> {
                gapi.load('auth2', () => {
                    console.log('google script loaded');
                    this.auth2 = gapi.auth2.init({
                        client_id: `${GOOGLE_CLIENT_ID}.apps.googleusercontent.com`,
                        scope: 'email profile openid',
                    }).then(this.login.bind(this),error=>{
                        Utils.showError('Error logging in',error)
                    });
                  /*  gapi.auth2.authorize({
                        client_id: "930957171392-4471lakpcubvjidtho0vsoqqhggonl1k.apps.googleusercontent.com",
                        scope: 'email profile openid',
                        prompt: 'select_account',
                        response_type: 'id_token code'
                    },response =>{
                        console.log('google callback', response);
                        if (response.error) {
                            Utils.showError(`Error logging in to google ${response.error}:${response.error_subtype}`);
                            return;
                        }
                        console.log('google.user',GoogleAuth.currentUser.get());
                        this.settings.loginCallback(response.id_token, response.code);
                    });*/
                });

            });
        });
    }
    login(googleAuth){
        console.log(googleAuth);
        const isSignedIn = googleAuth.isSignedIn.get();
        if (!isSignedIn){
            googleAuth.signIn().then(this.handleGoogleUser.bind(this), error=>{
                Utils.showError(`Error logging in: ${error.toString()}`);
            });
            return;
        }
        const googleUser = googleAuth.currentUser.get();
        this.handleGoogleUser(googleUser);
    }
    handleGoogleUser(googleUser){
        const profile = googleUser.getBasicProfile();
        const email = profile.getEmail();
        const name = profile.getName();
        const userId = googleUser.getId();
        const access_token = googleUser.getAuthResponse().access_token;
        const id_token = googleUser.getAuthResponse().id_token;
        this.settings.loginCallback({
            name,
            email,
            userId,
            access_token,
            id_token
        });

    }


}

class FacebookLogin{
    settings
    initialize(settings) {
        this.settings = settings;
        console.log('initializing facebook');
        $('#facebook-login').click(event=>{
            $.getScript('https://connect.facebook.net/en_US/sdk.js', ()=>{
                console.log('facebook script loaded');
                FB.init({
                    appId: FACEBOOK_APP_ID,
                    version: 'v2.7' // or v2.1, v2.2, v2.3, ...
                });
                FB.getLoginStatus(this.statusChangeCallback.bind(this));
            });

        });
    }
    statusChangeCallback(response) {  // Called with the results from FB.getLoginStatus().
        console.log('fb statusChangeCallback');
        console.log(response);                   // The current login status of the person.
        if (response.status === 'connected') {   // Logged into your webpage and Facebook.
            this.handleCallback(response.authResponse);
        } else {                                 // Not logged into your webpage or we are unable to tell.
            console.log('FB need login.');
            this.showLogin();
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