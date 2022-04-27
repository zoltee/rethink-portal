class BCUser{
	brainCloudClient;
	user;
	BCUserAttributes;
	static LSPrefix = 'Rethink.';
	retriedReconnect = false;
	refreshedAttributes = null;
	refreshedUser = null;
	get userData(){
		return this.user;
	}
	get identityType(){
		return Utils.readLS('identityType');// EmailPassword / Facebook / Google
	}
	constructor(BCAppId, BCSecret, BCVersion) {
		this.brainCloudClient = new BrainCloudWrapper("_mainWrapper");
		this.brainCloudClient.initialize(BCAppId, BCSecret, BCVersion);
		this.brainCloudClient.brainCloudClient.enableLogging(true);
		const bcUser = Utils.readJSONLS("BC-User");
		if(bcUser){
			this.setUser(bcUser, false);
		}
		// const identities = this.getIdentities();
	}
	isUserLoggedIn() {
		console.log('check user logged in');
		const userData = Utils.readLS("BC-User");
		const profileId = localStorage.getItem('_mainWrapper.profileId');
		if (userData && profileId) {
			const loggedIn = this.brainCloudClient.brainCloudClient.isAuthenticated();
			console.log('login status:',loggedIn);
			return loggedIn;
		}
		console.log('not logged in');
		return null;
	}
	setUser(data, saveLocal = true) {
		console.log('applying user data',data);
		if (data) {
			if (saveLocal){
				Utils.writeJSONLS("BC-User", data);
			}
			this.user = data;
			if (this.user.pictureUrl) {
				this.readAttribute('avatarGLB').then(glbURL=> {
					Utils.applyProfileURL(this.user.pictureUrl, glbURL?.length > 0);
				});
			}
			/*this.refreshIdentities().then(identities=>{
				console.log('loaded identities');
			});*/
		}
	}
	async readUser() {
		console.log('reading user data');
		if (this.user) {
			return this.user
		} else {
			return this.reconnectUser();
		}
	}
	async reconnectUser() {
		console.log('reconnecting user');
		return new Promise((resolve, reject) => {
			this.brainCloudClient.reconnect(async result => {
				this.retriedReconnect = true;
				if(await this.interpretStatus(result)){
					this.refreshedUser = true;
					this.setUser(result.data);
					resolve(result.data);
				}else {
					reject("Unable to load User data - "+ result.status_message);
				}
			});
		});
	}

	async loginUser(email, password, create = false) {
		console.log('login user');
		return new Promise((resolve, reject) => {
			this.user = null;
			this.brainCloudClient.authenticateEmailPassword(
				email,
				password,
				create,
				async result => {
					if(await this.interpretStatus(result)){
						Utils.writeLS('identityType', 'EmailPassword');
						this.refreshedUser = true;
						this.setUser(result.data);
						console.log("logged in");
						resolve(this.user);
					} else {
						reject("The email/password you entered was incorrect - " + result.status_message)
					}
				}
			);
		});
	}
	async loginFacebook(facebookId, token, forceCreate = false) {
		console.log('login user');
		return new Promise((resolve, reject) => {
			this.user = null;
			this.brainCloudClient.authenticateFacebook(facebookId, token, forceCreate,
				async result => {
					if(await this.interpretStatus(result)){
						Utils.writeLS('identityType', 'Facebook');
						this.refreshedUser = true;
						this.setUser(result.data);
						console.log("facebook logged in");
						resolve(this.user);
					} else {
						reject("FB Authentication error - " + result.status_message)
					}
				}
			);
		});
	}

	async loginGoogle(googleUserId, serverAuthCode, forceCreate = false) {
		console.log('login user');
		return new Promise((resolve, reject) => {
			this.user = null;
			this.brainCloudClient.authenticateGoogle(googleUserId, serverAuthCode, forceCreate,
				async result => {
					if(await this.interpretStatus(result)){
						Utils.writeLS('identityType', 'Google');
						this.refreshedUser = true;
						this.setUser(result.data);
						console.log("google logged in");
						resolve(this.user);
					} else {
						reject("G Authentication error - " + result.status_message)
					}
				}
			);
		});
	}

	async updateAttributes(attributes){
		console.log('update attributes', attributes);
		const updatedAttributes = {...this.BCUserAttributes ?? {}, ...attributes};
		console.log('saving attributes', updatedAttributes);
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.updateAttributes(updatedAttributes, false, async result => {
				if(await this.interpretStatus(result)){
					this.BCUserAttributes = updatedAttributes;
					resolve();
				}else{
					reject(result.status+' : '+ result.status_message);
				}
			});
		});
	}

	async readAttribute(attribute){
		console.log('read attribute', attribute);
		if (this.BCUserAttributes && this.BCUserAttributes[attribute]){
			console.log(`found existing value for attribute ${attribute}:`, this.BCUserAttributes[attribute]);
			return this.BCUserAttributes[attribute];
		}
		const lSAttributes = Utils.readJSONLS('attributes');
		if (lSAttributes && lSAttributes[attribute]){
			// no wait
			if (this.refreshedAttributes === null) {
				this.loadAttributes().then(attributes => {
					console.log('refreshed attributes', attributes);
				});
			}
			return lSAttributes[attribute];
		}
		const attributes = await this.loadAttributes();
		return attributes[attribute];
	}

	async loadAttributes(){
		console.log('loading attributes');
		if (this.refreshedAttributes === false && this.attributePromise){
			return this.attributePromise;
		}
		this.attributePromise = new Promise((resolve, reject) => {
			console.log('refreshing attributes');
			this.refreshedAttributes = false;
			this.brainCloudClient.playerState.getAttributes(async result =>{
				if(await this.interpretStatus(result)){
					this.refreshedAttributes = true;
					this.attributePromise = null;
					this.BCUserAttributes = result.data.attributes;
					Utils.writeJSONLS('attributes', this.BCUserAttributes);
					resolve(this.BCUserAttributes);
				}else{
					reject(result.status+' : '+ result.status_message);
				}
			});
		});
		return this.attributePromise;
	}


	/*async updateUsername(username){
		return await this.updateAttributes({username});
	}*/

	async logout() {
		console.log('logout');
		localStorage.removeItem(BCUser.LSPrefix+"BC-User");
		localStorage.removeItem(BCUser.LSPrefix+"email");
		localStorage.removeItem(BCUser.LSPrefix+"username");
		localStorage.removeItem(BCUser.LSPrefix+"headset-code");
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.logout(result => {
				console.log('logout', result);
				resolve(true);
			});
		});
	}
	async interpretStatus(result, showError = false){
		console.log(result);
		switch (result.status){
			case 200: return true;
			case 403:
				if (result.reason_code === 40426) {
					if (this.retriedReconnect) {
						document.location.href = '/authenticate';
					}
					try {
						await this.reconnectUser();
						return true;
					} catch (e) {
						if (showError) Utils.showError('Error while trying to reconnect after session was lost');
						return false;
					}
				}
				break;
			default:
				if (showError) Utils.showError(result.status_message);
				return false;
			break;
		}
		return false;
	}

	async refreshIdentities(){
		return new Promise((resolve, reject) => {
			this.brainCloudClient.identity.getIdentities(async result => {
				console.log('got identities', result);
				if(await this.interpretStatus(result)){
					Utils.writeJSONLS('identities', result.data.identities);
					resolve(result.data.identities);
				}else{
					reject(result.status+' : '+ result.status_message);
				}
			});
		});
	}
	getIdentities(){
		this.refreshIdentities().then(identities => {
			console.log('refresh identities from get');
		});
		return Utils.readJSONLS('identities');
	}


	async readUserData(){
		console.log('read user data');
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.readUserState(async result => {
				if(await this.interpretStatus(result)){
					this.refreshedUser = true;
					this.setUser(result.data);
					resolve(result.data);
				} else {
					reject("Unable to load User data - "+ result.status_message);
				}
			});
		});
	}
	async emailExists(email){
		console.log(`check if email exists ${email}`);
		const response = await $.get(
			`https://portal.braincloudservers.com/webhook/13623/emailExists/fc93c494-1167-4dd4-89f5-b7c1d4dfe25b?emailAddress=${encodeURIComponent(email)}`);
		return response?.existence ?? false;
	}

	async verifyHeadsetCode(code){
		console.log(`verify headset code ${code}`);
		const response = await $.get(
			`https://portal.braincloudservers.com/webhook/13623/pairHeadset/b57e8ed4-b1fc-44f8-8793-743f9c28d4fc?code=${code}`);
		const headsetRecord = response?.headsetRecord ?? false;
		console.log('got headset data', headsetRecord);
		if (headsetRecord){
			delete headsetRecord.data.code;
			// Delete pairing record, no need to wait
			$.get(
				`https://portal.braincloudservers.com/webhook/13623/deleteHeadsetCode/f2d0db03-1345-41f8-a588-4c078d6cba17?entityId=${headsetRecord.entityId}`);
			await this.updateAttributes({headsetData: headsetRecord.data});
			return headsetRecord.data;
		}
		return false;
	}

	async updateEmail(email, password){
		console.log(`update email to ${email}`);
		this.brainCloudClient.identity.changeEmailIdentity(this.user.emailAddress, password, email, true, async result => {
			return this.interpretStatus(result);
		});
	}
	async updateUsername(username){
		console.log(`update username to ${username}`);
		this.brainCloudClient.playerState.updateUserName(username, async result => {
			const updatedUserName = await this.interpretStatus(result) ? result.data?.playerName : false;
			if (updatedUserName){
				this.user.playerName = updatedUserName;
				this.setUser(this.user, true);
				Utils.writeLS('username', updatedUserName);
			}
			return updatedUserName;
		});
	}
	async setAvatar(avatarURL, customized = false){
//		await this.updateAttributes({isCustomizedAvatar: customized});
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.updateUserPictureUrl(avatarURL, async result => {
				if(await this.interpretStatus(result)){
					console.log('set avatar result', result);
					this.user.pictureUrl = result.data.playerPictureUrl;
					Utils.applyProfileURL(avatarURL, customized);
					resolve(result.data.playerPictureUrl);
				}else{
					reject(result.status+' : '+ result.status_message);
				}
			});
		});
	}
}
class Utils{
	static showError(message) {
		$("#error-message").show().text(message);
	}
	static showSuccess(message) {
		$("#success-message").show().text(message);
	}
	static validateEmail(emailInput){
		const email = emailInput.val();
		// if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)){
		if (/^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/.test(email)){
			return true;
		}
		return false;
	}
	static validateUsername(usernameInput){
		const username = usernameInput?.val();
		if (/^[a-z0-9_. -]+$/i.test(username)){
			Utils.writeLS('username', username);
			return true;
		}
		Utils.showError('Invalid screen name');
		return false;
	}
	static validatePassword(passwordInput){
		const password = passwordInput?.val();
		if (/^\w+$/.test(password)){
			return true;
		}
		Utils.showError('Invalid password');
		return false;
	}
	static comparePasswords(passwordInput, passwordAgainInput){
		const password = passwordInput?.val();
		const passwordAgain = passwordAgainInput?.val();
		if (password === passwordAgain){
			return true;
		}
		Utils.showError("Passwords don't match");
		return false;
	}
	static readLS(field){
		return localStorage.getItem(BCUser.LSPrefix+field);
	}
	static writeLS(field, value){
		localStorage.setItem(BCUser.LSPrefix+field, value);
	}
	static readJSONLS(field){
		const jsonData = Utils.readLS(field);
		if (!jsonData || jsonData === 'undefined') {
			return null;
		}
		return Utils.parseJSON(jsonData);
	}
	static writeJSONLS(field, value){
		localStorage.setItem(BCUser.LSPrefix+field, JSON.stringify(value));
	}

	static redirectToLogin(){
		document.location.href = '/authenticate';
	}

	static applyProfileURL(url, customized = false){
		if (customized) {
			$('.applied-avatar.custom-avatar').attr('src', url);
		}
		$('.applied-avatar:not(.custom-avatar)').attr('src', url);
		$('.applied-avatar-bg').css('background-image', `url('${url}')`);
	}

	static parseJSON(string){
		try {
			return JSON.parse(string);
		} catch (error) {
			return null;
		}
	}
	static async checkLoggedIn(){
		console.log('checking login status');
		const isLoggedIn = bcUser.isUserLoggedIn();
		if (isLoggedIn === null){
			console.log('no user info');
			Utils.redirectToLogin();
		}
		if (isLoggedIn === false){
			console.log('not logged in');
			try {
				await bcUser.reconnectUser();
			}catch(e){
				console.log(e);
				Utils.redirectToLogin();
			}
		}
	}
}
