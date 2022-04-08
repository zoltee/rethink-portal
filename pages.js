$(function() {
    if (reThinkPage) {
        switch (reThinkPage) {
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
        }
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
        if (!this.bcUser.isUserLoggedIn()){
            document.location.href = '/authenticate';
        }
    }
}
class AuthenticatePage extends Page{
    constructor() {
        super();
        const emailInput = $('#email');
        emailInput.val(readLS('email') ?? '');
        $('#register-button').click(event =>{
            if (!this.validateEmail(emailInput)){
                event.preventDefault();
                this.bcUser.showError('Invalid email address');
            }
        });
        $('#login-button').click(event =>{
            if (!this.validateEmail(emailInput)){
                event.preventDefault();
                this.bcUser.showError('Invalid email address');
            }
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
        const usernameInput = $('#username');
        usernameInput.val(this.bcUser.readLS('username') ?? '');
        $('#next-button').click(event => {
            if (!this.validateUsername(usernameInput)){
                event.preventDefault();
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
        const passwordInput = $('#password');
        const passwordAgainInput = $('#password-again');
        $('#next-button').click(event => {
            event.preventDefault();
            if (this.validatePassword(passwordInput) && this.comparePasswords(passwordInput, passwordAgainInput)) {
                this.register(this.bcUser.readLS('email'), passwordInput?.val());
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
    register(email, password){
        const $emailForm = $('#email-form').hide();
        const $loading = $('#loading').show();
        this.bcUser.loginUser(email, password, true)
            .then(data => {
                if(data && data.newUser === "false"){
                    document.location.href = '/';
                } else {
                    document.location.href = $('#next-button').attr('href');
                }
            })
            .catch(error => {
                console.log(error);
                this.bcUser.showError('The email/password you entered was incorrect');
                $loading.hide();
                $emailForm.show();
            });
    }
}
class ConfirmEmailPage extends Page{
    constructor() {
        super();
        $('#email-address').text(this.bcUser.readLS('email'));
        const codeInputs = $('input[name="email-code[]"]');
        $("#next-button").click(event => {
            event.preventDefault();
            if (!this.validateEmailCode(codeInputs)) {
                this.bcUser.showError("Invalid email code");
            }else{
                this.checkStatus();
            }
        });
    }
    validateEmailCode(codeInputs) {
        let code = "";
        for (var i = 0; i < 4; i++) {
            if (codeInputs[i].value.length !== 1) {
                return false;
            }
            code += codeInputs[i].value;
        }
        this.bcUser.writeLS("email-code", code);
        return true;
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
