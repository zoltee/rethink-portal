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
        if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)){
            this.bcUser.writeLS('email', email);
            return true;
        }
        return false;
    }
    validateUsername(usernameInput){
        const username = usernameInput?.val();
        if (/^\w+$/.test(username)){
            this.bcUser.writeLS('username', username);
            return true;
        }
        this.bcUser.showError('Invalid username');
        return false;
    }
    async initialize(){
        console.log('generic init', this);
    }
    async isLoggedIn(){
        console.log('checking login status');
        const isLoggedIn = this.bcUser.isUserLoggedIn();
        if (isLoggedIn === null){
            console.log('no user info');
            this.redirectToLogin();
        }
        if (isLoggedIn === false){
            console.log('not logged in');
            this.bcUser.reconnectUser().catch(()=>{
                this.redirectToLogin();
            });
        }
    }
    redirectToLogin(){
        document.location.href = '/authenticate';
    }

}

class HomePage extends Page{
    async initialize(){
        await this.isLoggedIn();
        $('#logout-link, #logout-button').click(event=>{
            event.preventDefault();
            this.bcUser.logout().then(()=>{
                this.isLoggedIn();
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
            this.bcUser.emailExists(emailInput.val()).then(exists => {
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
    validatePassword(passwordInput){
        const password = passwordInput?.val();
        if (/^\w+$/.test(password)){
            return true;
        }
        this.bcUser.showError('Invalid password');
        return false;
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
        usernameInput.val(this.bcUser.readLS('username') ?? '');
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
        await this.isLoggedIn();
        $('.readonly').addClass('readonly');
        this.bcUser.readUser().then(data => {
            $('#email').val(data.emailAddress);
        });

        const username = await this.bcUser.readAttribute('username');
        $('#username').val(username);
        const firstname = await this.bcUser.readAttribute('firstname');
        $('#firstname').val(firstname);
        const lastname = await this.bcUser.readAttribute('lastname');
        $('#lastname').val(lastname);
        $(".profile-edit").click(event => {
            const $inputField = $(event.currentTarget).parent('.profile-field-wrapper').find('.profile-input');
            $inputField.removeClass('readonly').focus().blur(e=>{
                $inputField.addClass('readonly');
                switch ($inputField.name){
                    case 'username':
                        if (!this.validateUsername($inputField)){
                            this.bcUser.showError('Invalid email address');
                            return false;
                        }
                        this.bcUser.updateUsername($inputField.val()).then(()=>{
                            this.bcUser.showSuccess('Username updated');
                        });
                    break;
                    case 'firstname':
                        this.bcUser.updateAttributes({firstname:$inputField.val()}).then(()=>{
                            this.bcUser.showSuccess('First Name updated');
                        });
                    break;
                    case 'lastname':
                        this.bcUser.updateAttributes({lastname:$inputField.val()}).then(()=>{
                            this.bcUser.showSuccess('Last Name updated');
                        });
                    break;
                    case 'email':
                        if (!this.validateEmail($inputField)){
                            this.bcUser.showError('Invalid email address');
                            return false;
                        }
                        this.bcUser.user.updateEmail($inputField.val()).then(()=>{
                            this.bcUser.showSuccess('Email address updated');
                        });
                    break;
                }

            });

        });
    }

}
