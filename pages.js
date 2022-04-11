$(function() {
    switch (reThinkPage) {
        default:
        case 'Home':
            new HomePage();
            break;
        case 'Authenticate':
            new AuthenticatePage();
            break;
        case 'Login':
            new LoginPage();
            break;
        case 'Pick Username':
            new PickUsernamePage();
            break;
        case 'Select Password':
            new SelectPasswordPage();
            break;
        case 'Confirm Email':
            new ConfirmEmailPage();
            break;
        case 'Pair Headset':
            new PairHeadsetPage();
            break;
    }
});
class Page{
    bcUser;
    constructor() {
        this.bcUser = new BCUser(BCAppId, BCSecret, BCVersion);
    }
}

class HomePage extends Page{
    constructor() {
        super();
        this.redirect();
        this.initialize();
    }
    redirect(){
        const isLoggedIn = this.bcUser.isUserLoggedIn();
        if (isLoggedIn === null){
            document.location.href = '/authenticate';
        }
        if (isLoggedIn === false){
            this.bcUser.reconnectUser().catch(()=>{
                document.location.href = '/authenticate';
            });
        }
    }
    initialize(){
        $('#logout-link').click(event=>{
            event.preventDefault();
            this.bcUser.logout().then(()=>{
                this.redirect();
            });
        });
    }
}
class AuthenticatePage extends Page{
    constructor() {
        super();
        this.initialize();
    }
    initialize(){
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
    validateEmail(emailInput){
        const email = emailInput.val();
        if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)){
            this.bcUser.writeLS('email', email);
            return true;
        }
        return false;
    }
}
class LoginPage extends Page{
    constructor() {
        super();
        this.initialize();
    }
    initialize(){
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
    constructor() {
        super();
        this.initialize();
    }
    initialize(){
        const usernameInput = $('#username');
        usernameInput.val(this.bcUser.readLS('username') ?? '');
        $('#next-button').click(event => {
            event.preventDefault();
            if (!this.validateUsername(usernameInput)){
                document.location.href = $("#next-button").attr('href');
            }
        });
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
}
class SelectPasswordPage extends Page{
    constructor() {
        super();
        this.initialize();
    }
    initialize(){
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
    constructor() {
        super();
        this.initialize();
    }
    initialize(){
        $('#email-address').text(this.bcUser.readLS('email'));
        $("#next-button").click(event => {
            event.preventDefault();
        });
        this.checkStatus();
    }
    checkStatus(){
        const intervalID = setInterval(() => {
            this.bcUser.readUserData().then(userData => {
                if (userData.emailVerified){
                    document.location.href = $("#next-button").attr('href');
                }
            });

        }, 1000);
    }
}
class PairHeadsetPage extends Page{
    constructor() {
        super();
        this.initialize();
    }
    initialize(){
        const codeInputs = $('input[name="headset-code[]"]');
        $("#next-button").click(event => {
            event.preventDefault();
            if (!this.validateHeadsetCode(codeInputs)) {
                this.bcUser.showError("Invalid headset code");
            }
        });
        codeInputs.keydown(event => {
            console.log(event);
            const targetId = event.target.id;
            const currentElement = $(event.target);
            const currentIndex = parseInt(targetId.charAt(-1));
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
                        if(currentIndex < 3){
                            $(`#headset-code-${currentIndex+1}`).focus();
                        }
                    break;
                    case 39: //right arrow
                        if(currentIndex > 0){
                            $(`#headset-code-${currentIndex-1}`).focus();
                        }
                    break;
                }
            }else{
                if(currentIndex > 0){
                    $(`#headset-code-${currentIndex-1}`).focus();
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
