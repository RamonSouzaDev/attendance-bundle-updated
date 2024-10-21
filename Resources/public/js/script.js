/**
 * Novo SGA - Atendimento
 * @author Rogerio Lino <rogeriolino@gmail.com>
 */
var App = App || {};

(function () {
    'use strict'
    
    var defaultTitle = document.title;
    
    const app = new Vue({
        el: '#attendance',
        data: {
            busy: false,
            filas: [],
            total: 0,
            tiposAtendimento: tiposAtendimento,
            servicosRealizados: [],
            servicosUsuario: JSON.parse(JSON.stringify(servicosUsuario)),
            usuario: {
                id: (usuario.id),
                local: local,
                numeroLocal: numeroLocal,
                tipoAtendimento: tipoAtendimento
            },
            novoLocal: {
                local: local ? local.id  : null,
                numeroLocal: numeroLocal,
                tipoAtendimento: tipoAtendimento
            },
            atendimento: (atendimento || null),
            unidade: (unidade || {}),
            atendimentoInfo: null,
            atendimentos: [],
            redirecionarAoEncerrar: false,
            servicoRedirecionar: null,
            search: '',
            searchResult: [],
            usuarios: [],
            novoUsuario: null,
            automaticCall: {
                enabled: false,
                interval: 0
            },
            autoCallTimer: null,
            isPaused: false,
            atendimentoEmAndamento: false,
        },
        methods: {
            update: function () {
                var self = this;
                App.ajax({
                    url: App.url('/novosga.attendance/ajax_update'),
                    success: function (response) {
                        response.data = response.data || {};
                        var estavaVazio = self.total === 0;
                        self.filas = response.data.filas || [];
                        self.usuario = response.data.usuario || {};
                        self.total = response.data.total;
                        
                        // habilitando botao chamar
                        if (self.total > 0) {
                            document.title = "(" + self.total + ") " + defaultTitle;
                            if (estavaVazio) {
                                try {
                                    document.getElementById('alert').play()
                                } catch (e) {
                                    console.error(e)
                                }
                                App.Notification.show('Atendimento', 'Novo atendimento na fila');
                            }
                        }
                    }
                });
            },
            
            infoSenha: function (atendimento) {
                var self = this;
                App.ajax({
                    url: App.url('/novosga.attendance/info_senha/') + atendimento.id,
                    success: function (response) {
                        self.atendimentoInfo = response.data;
                        $('#dialog-senha').modal('show');
                    }
                });
            },

            startAutomaticCall() {
                if (this.automaticCall.enabled && !this.isPaused && !this.atendimentoEmAndamento) {
                    this.stopAutomaticCall();
                    this.autoCallTimer = setTimeout(() => {
                        this.chamar({ target: { disabled: false } });
                    }, this.automaticCall.interval * 1000);
                }
            },

            stopAutomaticCall() {
                if (this.autoCallTimer) {
                    clearTimeout(this.autoCallTimer);
                    this.autoCallTimer = null;
                }
            },
    
            stopAutomaticCall() {
                clearTimeout(this.autoCallTimer);
            },
    
            toggleAutomaticCall() {
                this.isPaused = !this.isPaused;
                if (this.isPaused) {
                    this.stopAutomaticCall();
                    App.Notification.info('Chamada automática pausada');
                } else {
                    this.startAutomaticCall();
                    App.Notification.info('Chamada automática retomada');
                }
            },
    
            getAutomaticCallSettings() {
                App.ajax({
                    url: App.url('/novosga.settings/get_automatic_call'),
                    type: 'get',
                    success: (response) => {
                        if (response.success) {
                            this.automaticCall = response.data;
                            this.verificarAtendimentoEIniciarChamada();
                        }
                    },
                    error: (error) => {
                        console.error('Erro ao obter configurações de chamada automática:', error);
                    }
                });
            },

            
            verificarAtendimentoEIniciarChamada() {
                App.ajax({
                    url: App.url('/novosga.attendance/atendimento'),
                    type: 'get',
                    success: (response) => {
                        if (response.data) {
                            this.atendimento = response.data;
                            this.atendimentoEmAndamento = true;
                            this.stopAutomaticCall();
                        } else {
                            this.atendimentoEmAndamento = false;
                            if (this.automaticCall.enabled && !this.isPaused) {
                                this.startAutomaticCall();
                            }
                        }
                    },
                    error: (error) => {
                        console.error('Erro ao verificar atendimento atual:', error);
                    }
                });
            },
            
            setLocal: function () {
                var self = this;
                
                App.ajax({
                    url: App.url('/novosga.attendance/set_local'),
                    type: 'post',
                    data: self.novoLocal,
                    success: function (response) {
                        Vue.set(self.usuario, 'numeroLocal', response.data.numero.value);
                        self.usuario.local             = response.data.local;
                        self.usuario.numeroLocal       = response.data.numero;
                        self.usuario.tipoAtendimento   = response.data.tipo;
                        self.novoLocal.local           = response.data.local.id;
                        self.novoLocal.numeroLocal     = response.data.numero;
                        self.novoLocal.tipoAtendimento = response.data.tipo;
                        self.filas                     = [];
                        self.total                     = 0;
                        self.update();
                        $('#dialog-local').modal('hide');
                    }
                });
            },
            
            chamar: function (e) {
                var self = this;
                self.busy = true;
                
                if (!e.target.disabled) {
                    e.target.disabled = true;
            
                    App.ajax({
                        url: App.url('/novosga.attendance/chamar'),
                        type: 'post',
                        success: function (response) {
                            self.atendimento = response.data;
                            self.atendimentoEmAndamento = true;
                            self.stopAutomaticCall();
                        },
                        complete: function () {
                            setTimeout(function () {
                                self.busy = false;
                                e.target.disabled = false;
                            }, 3 * 1000);
                        }
                    });
                }
            },
            
            chamarServico: function (servico) {
                var self = this;
                self.busy = true;

                App.ajax({
                    url: App.url('/novosga.attendance/chamar/servico/' + servico.id),
                    type: 'post',
                    success: function (response) {
                        self.atendimento = response.data;
                    },
                    complete: function () {
                        setTimeout(function () {
                            self.busy = false;
                        }, 3 * 1000);
                    }
                });
            },

            verificarAtendimentoEmAndamento() {
                App.ajax({
                    url: App.url('/novosga.attendance/atendimento'),
                    type: 'get',
                    success: (response) => {
                        if (response.data) {
                            this.atendimento = response.data;
                            this.atendimentoEmAndamento = true;
                        } else {
                            this.atendimentoEmAndamento = false;
                        }
                    },
                    error: (error) => {
                        console.error('Erro ao verificar atendimento atual:', error);
                    }
                });
            },
            
            iniciar: function () {
                var self = this;
                App.ajax({
                    url: App.url('/novosga.attendance/iniciar'),
                    type: 'post',
                    success: function (response) {
                        self.atendimento = response.data;
                        self.atendimentoEmAndamento = true;
                        self.stopAutomaticCall();
                    }
                });
            },
            
            naoCompareceu: function () {
                var self = this;
                
                swal({
                    title: alertTitle,
                    text: alertNaoCompareceu,
                    type: "warning",
                    buttons: [
                        labelNao,
                        labelSim
                    ],
                    //dangerMode: true,
                })
                .then(function (ok) {
                    if (!ok) {
                        return;
                    }
                    
                    App.ajax({
                        url: App.url('/novosga.attendance/nao_compareceu'),
                        type: 'post',
                        success: function () {
                            self.atendimento = null;
                            self.atendimentoEmAndamento = false;
                            self.verificarAtendimentoEIniciarChamada();
                        },
                        error: function (error) {
                            console.error('Erro ao registrar não comparecimento:', error);
                        },
                        complete: function () {
                            self.busy = false;
                        }
                    });
                });
            },
            
            erroTriagem: function () {
                this.novoUsuario = null;
                this.servicoRedirecionar = null;
                $('#dialog-redirecionar').modal('show');
            },
            
            preparaEncerrar: function () {
                this.servicosRealizados = [];
                this.servicosUsuario = JSON.parse(JSON.stringify(servicosUsuario));
                if (this.servicosUsuario.length === 1) {
                    var su = this.servicosUsuario[0];
                    if (su.subServicos.length === 0) {
                        this.addServicoRealizado(su.servico);
                    } else if (su.subServicos.length === 1) {
                        this.addServicoRealizado(su.subServicos[0]);
                    }
                }
                this.atendimento.status = 'encerrando';
            },
            
            encerrarVoltar: function () {
                this.atendimento.status = 'iniciado';
            },
            
            fazEncerrar: function (isRedirect) {
                var self = this;
                
                var servicos = this.servicosRealizados.map(function (servico) {
                    return servico.id;
                });
                
                if (servicos.length === 0) {
                    $('#dialog-erro-encerrar').modal('show');
                    return;
                }
                
                var data = {
                    redirecionar: false,
                    servicos: servicos.join(','),
                    resolucao: this.atendimento.resolucao,
                    observacao: this.atendimento.observacao
                };
                
                if (isRedirect) {
                    if (!this.servicoRedirecionar) {
                        $('#dialog-erro-encerrar').modal('show');
                        return;
                    }
                    data.redirecionar = true;
                    data.novoServico = this.servicoRedirecionar;
                    data.novoUsuario = this.novoUsuario;
                } else if (this.redirecionarAoEncerrar) {
                    this.novoUsuario = null;
                    this.servicoRedirecionar = null;
                    $('#dialog-redirecionar').modal('show');
                    return;
                }
                
                swal({
                    title: alertTitle,
                    text: alertEncerrar,
                    type: "warning",
                    buttons: [
                        labelNao,
                        labelSim
                    ],
                    //dangerMode: true,
                })
                .then(function (ok) {
                    if (!ok) {
                        return;
                    }
                    
                    App.ajax({
                        url: App.url('/novosga.attendance/encerrar'),
                        type: 'post',
                        data: data,
                        success: function () {
                            self.atendimento = null;
                            self.atendimentoEmAndamento = false;
                            self.redirecionarAoEncerrar = false;
                            $('.modal').modal('hide');
                            self.verificarAtendimentoEIniciarChamada();
                        }
                    });
                });
            },
            
            encerrar: function(isRedirect) {
                this.redirecionarAoEncerrar = false;
                this.fazEncerrar(isRedirect);
            },

            reativarChamadaAutomatica: function() {
                if (this.automaticCall.enabled && !this.isPaused) {
                    this.startAutomaticCall();
                }
            },
            
            encerrarRedirecionar: function() {
                this.redirecionarAoEncerrar = true;
                this.fazEncerrar(false);
            },
            
            changeServicoRedirecionar: function () {
                var servico = this.servicoRedirecionar,
                    self = this;
            
                this.usuarios = [];
            
                if (servico > 0) {
                    App.ajax({
                        url: App.url(`/novosga.attendance/usuarios/${servico}`),
                        success: function (response) {
                            self.usuarios = response.data;
                        }
                    });
                }
            },
            
            redirecionar: function () {
                var servico = this.servicoRedirecionar,
                    self = this;
            
                if (servico > 0) {
                    swal({
                        title: alertTitle,
                        text: alertRedirecionar,
                        type: "warning",
                        buttons: [
                            labelNao,
                            labelSim
                        ],
                        //dangerMode: true,
                    })
                    .then(function (ok) {
                        if (!ok) {
                            return;
                        }

                        App.ajax({
                            url: App.url('/novosga.attendance/redirecionar'),
                            type: 'post',
                            data: {
                                servico: servico,
                                usuario: self.novoUsuario
                            },
                            success: function () {
                                self.atendimento = null;
                                $('.modal').modal('hide');
                            }
                        });
                    });
                }
            },
            
            addServicoRealizado: function (servico) {
                this.servicosRealizados.push(servico);
                servico.disabled = true;
            },
            
            removeServicoRealizado: function (servico) {
                this.servicosRealizados.splice(this.servicosRealizados.indexOf(servico), 1);
                servico.disabled = false;
            },
            
            consultar: function () {
                var self = this;
                App.ajax({
                    url: App.url('/novosga.attendance/consulta_senha'),
                    data: {
                        numero: self.search
                    },
                    success: function (response) {
                        self.searchResult = response.data;
                    }
                });
            },

            getItemFilaStyle(atendimento) {
                let styles = []
                if (atendimento.prioridade.cor) {
                    styles.push(`color: ${atendimento.prioridade.cor}`)
                }
                return styles.join(';')
            },

            startPeriodicUpdate() {
                setInterval(() => {
                    this.update();
                }, 30000);
            },

            async loadCustomer() {
                const modal = $('#dialog-customer .modal-body')
                modal.html('')
                const url = `${this.$el.dataset.baseUrl}customer/${this.atendimento.id}`
                const resp = await fetch(url)
                if (resp.ok) {
                    const html = await resp.text()
                    modal.html(html)
                }
            },

            recarregar() {
                App.ajax({
                    url: App.url('/novosga.attendance/atendimento'),
                    success: (response) => {
                        this.atendimento = response.data;
                    }
                })
            },

            saveCustomer() {
                const url = `${this.$el.dataset.baseUrl}customer/${this.atendimento.id}`
                const modal = $('#dialog-customer .modal-body')
                const data = modal.parent('form').serialize()
                modal.find(':input').attr('disabled', true)
                $.post(url, data, (response, textStatus, jqXHR) => {
                    if (jqXHR.status === 200) {
                        this.recarregar()
                    }
                    modal.html(response)
                });
            }
        },
        watch: {
            atendimento(novoAtendimento) {
                this.atendimentoEmAndamento = !!novoAtendimento;
            }
        },
        beforeDestroy() {
            this.stopAutomaticCall();
        },
        mounted() {
            // Verificar permissões de notificação
            if (!App.Notification.allowed()) {
                $('#notification').show();
            }
        
            // Verificar atendimento atual e configurações de chamada automática
            this.verificarAtendimentoEmAndamento();
            this.getAutomaticCallSettings();
        
            // Configurar SSE (Server-Sent Events)
            App.SSE.connect([
                `/unidades/${this.unidade.id}/fila`,
                `/usuarios/${this.usuario.id}/fila`,
            ]);
        
            App.SSE.onmessage = (e, data) => {
                this.update();
            };
        
            // Fallback para polling AJAX
            App.SSE.ondisconnect = () => {
                this.update();
            };
        
            // Atualizar informações iniciais
            if (this.usuario.numeroLocal) {
                this.update();
            }
        
            // Iniciar verificação periódica
            this.startPeriodicUpdate();
        },
    });
    
    if (!local) {
        $('#dialog-local').modal('show');
    }


    $('#dialog-customer').on('shown.bs.modal', () => {
        app.loadCustomer()
    })
})();
