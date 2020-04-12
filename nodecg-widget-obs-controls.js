/**
 * `nodecg-widget-obs-controls`
 * The controls for a specific connection to OBS.
 *
 * @customElement
 * @polymer
 */
const remoteOBS = nodecg.Replicant('remoteOBS');
class NodecgWidgetObsControls extends Polymer.Element {
	static get is() {
		return 'nodecg-widget-obs-controls';
	}

	static get properties() {
		return {
			namespace: {
				type: String,
				observer: '_namespaceChanged'
			},
			websocketReplicant: {
				type: Object,
				readOnly: true
			},
			status: {
				type: String,
				value: 'disconnected',
				observer: '_statusChanged',
				readOnly: true,
				notify: true
			},
			password: String
		};
	}

	constructor() {
		super();
		this._handleWebsocketReplicantChange = this._handleWebsocketReplicantChange.bind(this);
	}

	ready() {
		super.ready();
		this.$.ipAddress.value = this.namespace.url;
		this.$.port.value = parseInt(this.namespace.port);
		console.log(this.$.ipAddress.value,":",this.$.port.value);
		console.log(this.namespace.url,":",this.namespace.port);
	}

	connect() {
		if (remoteOBS.value.currentRemote.length > 0)
			nodecg.sendMessage(`${remoteOBS.value.currentRemote}:disconnect`);

		nodecg.sendMessage(`${this.namespace.name}:connect`, {
			ip: this.$.ipAddress.value,
			port: parseInt(this.$.port.value, 10),
			password: this.password
		}).catch(err => {
			this.dispatchEvent(new CustomEvent('connection-failure', {
				detail: err,
				bubbles: true,
				composed: true
			}));
		});
		remoteOBS.value.currentRemote = this.namespace.name;
		remoteOBS.value.currentMesh = this.namespace.mesh;
	}

	disconnect() {
		nodecg.sendMessage(`${this.namespace.name}:disconnect`);
		if (remoteOBS.value.currentRemote == this.namespace.name) {
			remoteOBS.value.currentRemote = "";
			remoteOBS.value.currentMesh = "";
		}
			
	}

	_namespaceChanged(newNamespace) {
		if (this.websocketReplicant) {
			this.websocketReplicant.removeListener('change', this._handleWebsocketReplicantChange);
		}
		this._setWebsocketReplicant(nodecg.Replicant(`${newNamespace.name}:websocket`));
		this.websocketReplicant.on('change', this._handleWebsocketReplicantChange);
	}

	_statusChanged(newStatus, oldStatus) {
		this.$.connect.hidden = newStatus === 'connected' || newStatus === 'connecting';
		this.$['indicator-status-online'].hidden = newStatus !== 'connected';

		this.$.disconnect.hidden = newStatus !== 'connected';
		this.$['indicator-status-offline'].hidden = newStatus !== 'disconnected' && newStatus !== 'error';

		this.$.abort.hidden = newStatus !== 'connecting';
		this.$['indicator-status-connecting'].hidden = newStatus !== 'connecting';

		if (oldStatus === 'connected') {
			this.dispatchEvent(new CustomEvent('disconnected', {bubbles: true, composed: true}));
		} else if (newStatus === 'connected') {
			this.dispatchEvent(new CustomEvent('connected', {bubbles: true, composed: true}));
			nodecg.sendMessage('getSetupData', '');
		}

		switch (newStatus) {
			case 'connected':
				this.$['indicator-led'].color = 'green';
				break;
			case 'connecting':
				this.$['indicator-led'].color = 'yellow';
				break;
			case 'disconnected':
			case 'error':
				this.$['indicator-led'].color = 'red';
				break;
			/* istanbul ignore next */
			default:
				// Do nothing.
		}
	}

	_handleWebsocketReplicantChange(newVal) {
		this.disableControls = newVal.status === 'connected' || newVal.status === 'connecting';
		this._setStatus(newVal.status);
		if (newVal.password.length > 0)
			this.password = newVal.password;
	}
}

window.customElements.define(NodecgWidgetObsControls.is, NodecgWidgetObsControls);
