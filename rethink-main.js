class BCUser{
	brainCloudClient;
	user;
	BCUserAttributes;
	static LSPrefix = 'Rethink.';
	constructor(BCAppId, BCSecret, BCVersion) {
		this.brainCloudClient = new BrainCloudWrapper("_mainWrapper");
		this.brainCloudClient.initialize(BCAppId, BCSecret, BCVersion);
		this.brainCloudClient.brainCloudClient.enableLogging(true);
	}
	isUserLoggedIn() {
		const userData = localStorage.getItem(BCUser.LSPrefix+"BC-User");
		const profileId = localStorage.getItem('_mainWrapper.profileId');
		if (userData && profileId) {
			return this.brainCloudClient.brainCloudClient.isAuthenticated();
		}
		return null;
	}
	showError(message) {
		$("#error-message").show().text(message);
	}
	setUser(data) {
		localStorage.setItem(BCUser.LSPrefix+"BC-User", JSON.stringify(data));
		this.user = data;
	}

	async readUser() {
		if (this.user) {
			return new Promise((resolve, reject) => {
				resolve(this.user);
			});
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
		return new Promise((resolve, reject) => {
			this.brainCloudClient.reconnect(result => {
				if (result.status === 200) {
					this.setUser(result.data);
					resolve(result.data);
				} else {
					reject("Unable to load User data - "+ result.status_message);
				}
			});
		});
	}

	async loginUser(email, password, create = false) {
		return new Promise((resolve, reject) => {
			this.user = null;
			this.brainCloudClient.authenticateEmailPassword(
				email,
				password,
				create,
				result => {
					console.log(result);
					if (result.status === 200) {
						this.setUser(result.data);
						console.log("logged in");
						resolve(this.user);
					} else {
						reject("The email/password you entered was incorrect - " + result.status_message);
					}
				}
			);
			/*}*/
		});
	}
	async updateAttributes(attributes){
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.updateAttributes(attributes, false, result => {
				if (result.status === 200) {
					resolve();
				}else{
					reject(result.status+' : '+ result.status_message);
				}
			});
		});
	}

	async readAttribute(attribute){
		return new Promise((resolve, reject) => {
			if (this.BCUserAttributes && this.BCUserAttributes[attribute]){
				return this.BCUserAttributes[attribute];
			}
			this.brainCloudClient.playerState.getAttributes(result =>{
				if (result.status === 200) {
					this.BCUserAttributes = result.data.attributes;
					resolve(this.BCUserAttributes[attribute]);
				}else{
					reject(result.status+' : '+ result.status_message);
				}
			});
		});
	}

	async updateUsername(username){
		return await this.updateAttributes({username});
	}

	async logout() {
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


	async readUserData(){
		return new Promise((resolve, reject) => {
			this.brainCloudClient.playerState.readUserState(result => {
				if (result.status === 200) {
					this.setUser(result.data);
					resolve(result.data);
				} else {
					reject("Unable to load User data - "+ result.status_message);
				}
			});
		});
	}
	async emailExists(email){
		const response = await $.get(
			`https://portal.braincloudservers.com/webhook/13623/emailExists/fc93c494-1167-4dd4-89f5-b7c1d4dfe25b?emailAddress=${email}`);
		return response?.existence ?? false;
	}
}

