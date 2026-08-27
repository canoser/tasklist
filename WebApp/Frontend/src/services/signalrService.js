import * as signalR from '@microsoft/signalr';
import apiClient from './apiClient'; // To get the auth token via localStorage or similar

class SignalRService {
    constructor() {
        this.connection = null;
        this.events = new EventTarget();
        this.isConnected = false;
    }

    startConnection() {
        if (this.connection) return; // Already initialized

        // apiClient token'ı localStorage'dan okur, biz de oradan alabiliriz.
        // auth_token cookie'de olabilir, query string de kullanılabilir.
        const token = localStorage.getItem('token');
        if (!token) return; // Kullanıcı giriş yapmamış

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5250';
        
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(`${baseUrl}/api/hubs/app`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Artan sürelerle yeniden bağlanmayı dener
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.connection.onreconnecting(error => {
            console.warn('SignalR yeniden bağlanıyor...', error);
        });

        this.connection.onreconnected(connectionId => {
            console.log('SignalR yeniden bağlandı. ID:', connectionId);
            this.dispatchEvent('reconnected');
        });

        this.connection.onclose(error => {
            console.error('SignalR bağlantısı kapandı', error);
            this.isConnected = false;
        });

        // Backend'den gelecek olayları dinle
        this.registerEvents();

        this.connection.start()
            .then(() => {
                this.isConnected = true;
                console.log('SignalR bağlantısı kuruldu.');
            })
            .catch(err => console.error('SignalR bağlantı hatası:', err));
    }

    registerEvents() {
        if (!this.connection) return;

        // Admin olayları
        this.connection.on("WorkspaceListUpdated", () => {
            this.dispatchEvent("WorkspaceListUpdated");
        });
        
        this.connection.on("PendingUsersUpdated", () => {
            this.dispatchEvent("PendingUsersUpdated");
        });

        // Kullanıcı olayları
        this.connection.on("UserApproved", () => {
            this.dispatchEvent("UserApproved");
        });

        // Çalışma alanı (Workspace) olayları
        this.connection.on("WorkspaceDetailsUpdated", (workspaceId) => {
            this.dispatchEvent("WorkspaceDetailsUpdated", { workspaceId });
        });

        this.connection.on("WorkspaceDeleted", (workspaceId) => {
            this.dispatchEvent("WorkspaceDeleted", { workspaceId });
        });

        this.connection.on("WorkspaceMembersUpdated", (workspaceId) => {
            this.dispatchEvent("WorkspaceMembersUpdated", { workspaceId });
        });

        this.connection.on("WorkspaceJoinApproved", (workspaceId) => {
            this.dispatchEvent("WorkspaceJoinApproved", { workspaceId });
        });

        this.connection.on("MemberJoinedAlert", (workspaceId, displayName) => {
            this.dispatchEvent("MemberJoinedAlert", { workspaceId, displayName });
        });

        this.connection.on("MemberPendingAlert", (workspaceId, displayName) => {
            this.dispatchEvent("MemberPendingAlert", { workspaceId, displayName });
        });

        this.connection.on("WorkspaceTasksUpdated", (workspaceId) => {
            this.dispatchEvent("WorkspaceTasksUpdated", { workspaceId });
        });

        this.connection.on("TaskAssigned", (workspaceId) => {
            this.dispatchEvent("TaskAssigned", { workspaceId });
        });
    }

    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        this.events.dispatchEvent(event);
    }

    addEventListener(eventName, callback) {
        this.events.addEventListener(eventName, callback);
    }

    removeEventListener(eventName, callback) {
        this.events.removeEventListener(eventName, callback);
    }

    stopConnection() {
        if (this.connection) {
            this.connection.stop();
            this.connection = null;
            this.isConnected = false;
        }
    }
}

const signalrService = new SignalRService();
export default signalrService;
