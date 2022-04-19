class BCUser{
	brainCloudClient;
	user;
	BCUserAttributes;
	static LSPrefix = 'Rethink.';
	retriedReconnect = false;
	constructor(BCAppId, BCSecret, BCVersion) {
		this.brainCloudClient = new BrainCloudWrapper("_mainWrapper");
		this.brainCloudClient.initialize(BCAppId, BCSecret, BCVersion);
		this.brainCloudClient.brainCloudClient.enableLogging(true);
		const jsonUserData = this.readLS("BC-User");
		if (jsonUserData && jsonUserData !== 'undefined') {
			try {
				this.user = JSON.parse(jsonUserData);
			}catch (e) {
				console.log('can`t parse userData from local storage', jsonUserData);
			}
		}
	}
	isUserLoggedIn() {
		console.log('check user logged in');
		const userData = this.readLS("BC-User");
		const profileId = localStorage.getItem('_mainWrapper.profileId');
		if (userData && profileId) {
			const loggedIn = this.brainCloudClient.brainCloudClient.isAuthenticated();
			console.log('login status:',loggedIn);
			return loggedIn;
		}
		console.log('not logged in');
		return null;
	}
	showError(message) {
		$("#error-message").show().text(message);
	}
	showSuccess(message) {
		$("#success-message").show().text(message);
	}
	setUser(data) {
		console.log('setting user data',data);
		if (data) {
			this.writeLS("BC-User", JSON.stringify(data));
			this.user = data;
			if (this.user.pictureUrl) {
				$(document).trigger('avatarURL', this.user.pictureUrl);
			}
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
	readLS(field){
		return localStorage.getItem(BCUser.LSPrefix+field);
	}
	writeLS(field, value){
		localStorage.setItem(BCUser.LSPrefix+field, value);
	}
	async reconnectUser() {
		console.log('reconnecting user');
		return new Promise((resolve, reject) => {
			this.brainCloudClient.reconnect(async result => {
				this.retriedReconnect = true;
				if(await this.interpretStatus(result)){
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
						this.setUser(result.data);
						console.log("logged in");
						resolve(this.user);
					} else {
						reject("The email/password you entered was incorrect - " + result.status_message)
					}
				}
			);
			/*}*/
		});
	}
	async updateAttributes(attributes){
		console.log('update attributes');
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.updateAttributes(attributes, false, async result => {
				if(await this.interpretStatus(result)){
					this.BCUserAttributes = {...this.BCUserAttributes ?? {}, ...attributes};
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
		const attributes = await this.loadAttributes();
		return attributes[attribute];
	}

	async loadAttributes(){
		console.log('loading attributes');
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.getAttributes(async result =>{
				if(await this.interpretStatus(result)){
					this.BCUserAttributes = result.data.attributes;
					resolve(this.BCUserAttributes);
				}else{
					reject(result.status+' : '+ result.status_message);
				}
			});
		});
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
						if (showError) this.showError('Error while trying to reconnect after session was lost');
						return false;
					}
				}
				break;
			default:
				if (showError) this.showError(result.status_message);
				return false;
			break;
		}
		return false;
	}

	async readUserData(){
		console.log('read user data');
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.readUserState(async result => {
				if(await this.interpretStatus(result)){
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
	async updateEmail(email, password){
		console.log(`update email to ${email}`);
		this.brainCloudClient.identity.changeEmailIdentity(this.user.emailAddress, password, email, true, async result => {
			return this.interpretStatus(result);
		});
	}
	async updateUsername(username){
		console.log(`update username to ${username}`);
		this.brainCloudClient.playerState.updateUserName(this.user.emailAddress, password, email, true, async result => {
			return this.interpretStatus(result);
		});
	}
	async setAvatar(avatarURL){
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.updateUserPictureUrl(avatarURL, async result => {
				if(await this.interpretStatus(result)){
					$(document).trigger('avatarURL', avatarURL);
					resolve(result.data.playerPictureUrl);
				}else{
					reject(result.status+' : '+ result.status_message);
				}
			});
		});
	}
}

