var BCUser;
var BCUserAttributes;
var brainCloudClient = new BrainCloudWrapper("_mainWrapper");
brainCloudClient.initialize(BCAppId, BCSecret, BCVersion);

const LSPrefix = 'Rethink.';
brainCloudClient.brainCloudClient.enableLogging(true);
function isUserLoggedIn() {
	const userData = localStorage.getItem(LSPrefix+"BC-User");
	const profileId = localStorage.getItem('_mainWrapper.profileId');
	if (userData &&  profileId) {
		if (!brainCloudClient.brainCloudClient.isAuthenticated()){
			brainCloudClient.reconnect(); //async
		}else{
			return true;
		}
	}
	return false;
}
function showError(message) {
	$("#error-message").show().text(message);
}
function setUser(data) {
	localStorage.setItem(LSPrefix+"BC-User", JSON.stringify(data));
	BCUser = data;
}

function readUser() {
	if (BCUser) {
		return new Promise((resolve, reject) => {
			resolve(BCUser);
		});
	} else {
		return reconnectUser();
	}
}
function readLS(field){
	return localStorage.getItem(LSPrefix+field);
}
function writeLS(field, value){
	localStorage.setItem(LSPrefix+field, value);
}
function reconnectUser() {
	return new Promise((resolve, reject) => {
		brainCloudClient.reconnect(function (result) {
			if (result.status === 200) {
				setUser(result.data);
				resolve(result.data);
			} else {
				reject("Unable to load User data - "+ result.status_message);
			}
		});
	});
}

function loginUser(email, password, create = false) {
	return new Promise((resolve, reject) => {
		if (isUserLoggedIn()) {
			resolve(true);
		} else {
			BCUser = null;
			brainCloudClient.authenticateEmailPassword(
				email,
				password,
				create,
				(result) => {
					console.log(result);
					if (result.status === 200) {
						setUser(result.data);
						console.log("logged in");
						resolve(BCUser);
					} else {
						reject("The email/password you entered was incorrect - " + result.status_message);
					}
				}
			);
		}
	});
}
function updateAttributes(attributes){
	return new Promise((resolve, reject) => {
		brainCloudClient.playerState.updateAttributes(attributes, false, result =>{
			if (result.status === 200) {
				resolve();
			}else{
				reject(result.status+' : '+ result.status_message);
			}
		});
	});
}

function readAttribute(attribute){
	return new Promise((resolve, reject) => {
		if (BCUserAttributes && BCUserAttributes[attribute]){
			return BCUserAttributes[attribute];
		}
		brainCloudClient.playerState.getAttributes(result =>{
			if (result.status === 200) {
				BCUserAttributes = result.data.attributes;
				resolve(BCUserAttributes[attribute]);
			}else{
				reject(result.status+' : '+ result.status_message);
			}
		});
	});
}

function updateUsername(username){
	return updateAttributes({username});
}



function logout() {
	localStorage.removeItem(LSPrefix+"BC-User");
	return new Promise((resolve, reject) => {
		brainCloudClient.playerState.logout((result) => {
			resolve(true);
		});
	});
}


function readUserData(){
	return new Promise((resolve, reject) => {
		brainCloudClient.playerState.readUserState((result) => {
			if (result.status === 200) {
				setUser(result.data);
				resolve(result.data);
			} else {
				reject("Unable to load User data - "+ result.status_message);
			}
		});
	});
}
