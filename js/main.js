'use strict';

moment.locale( myUtil.getBrowserLang() );

(function () {
    
    const baseUri = "http://mo-0a20d9d7b.mo.sap.corp:8006/sap/bc/zlogon_user?mode=",
          initPage = "INITIAL",
          summaryPage = "SUMMARY",
          detailPage = "DETAIL",
          logOnUserMode = "LOGONUSERS",
          wlStatMode = "WLSTAT",
          userInfoMode = "USERINFO",
          comUser = "Communications (C)",
          diaUser = "Dialog (A)",
          refUser = "Reference (L)",
          srvUser = "Service (S)",
          sysUser = "System (B)"
          ;

    var app = angular.module('usageAnaApp', [ 'ui.bootstrap', 'pascalprecht.translate', 'chart.js', 'angular.filter' ]),
        lang,
        initUri = baseUri + initPage,
        detailUri = baseUri + logOnUserMode,
        wlStatUri = baseUri + wlStatMode,
        userInfoUri = baseUri + userInfoMode,
        createPage,
        getJson,
        getStatJson,
        setInit,
        setSummary,
        setDetail,
        setUserInfo,
        procInit,
        procSummary,
        procDetail,
        createPivot,
        renderOptions = {},
        filterData = {},
        initPivotOptions,
        handlePageFlags,
        gUibModal,
        pbModalInstance,
        getUserStat,
        gHttpService,
        createAlert
        ;

    app.config(['$translateProvider', function( $translateProvider ) {
        $translateProvider.useStaticFilesLoader({
            prefix : 'lang/lang_',
            suffix : '.json'
        });
        $translateProvider.preferredLanguage( lang = myUtil.getBrowserLang() === undefined ? "en" : myUtil.getBrowserLang() );
        //$translateProvider.useSanitizeValueStrategy('escape');
        $translateProvider.useSanitizeValueStrategy(null); // In order to show "&" with cording style {{ "text" | translate }}
    }]);

    app.decorator("$xhrFactory", ["$delegate", "$injector", function($delegate, $injector) {
            return function(method, url) {
                var xhr = $delegate(method, url);
                var $http = $injector.get("$http");
                var callConfig = $http.pendingRequests[$http.pendingRequests.length - 1];
                if (angular.isFunction(callConfig.onProgress))
                    xhr.addEventListener("progress", callConfig.onProgress);
                return xhr;
            };
        }
    ]);

    app.controller('MainCtrl', ['$scope', '$http', '$uibModal', '$translate', function( $scope, $http, $uibModal, $translate ) {

        var showSummary,
            showDetail
            ;

        gUibModal = $uibModal;
        gHttpService = $http;

        $scope.isBtnSummary = false; $scope.isBtnDetail = false;

        // For Language
        $scope.languages = {
            en : "English", 
            ja: "日本語"
        };
        $scope.currentLang = $scope.languages[$translate.proposedLanguage()];

        // For Accordion
        $scope.oneAtATime = true;
        $scope.status = {
            isCustomHeaderOpen: false,
            isFirstOpen: true,
            isFirstDisabled: false
        };
        // For Lanaguage Selection
        $scope.selectLang = function ( langKey )
        {
            $translate.use( langKey );
            $scope.currentLang = $scope.languages[$translate.proposedLanguage()];

            //$scope.summaryMode = setIndirMsg( $scope.radioModel, $translate );
        };

        // For translation 
        //$scope.translate = function ( id ) { return $translate.instant(id); };

        // For Table Sort/Filter
        $scope.summarySortType = 'MANDT';    // Default Sort Type in User Info Table.
        $scope.summarySortReverse = false;      // Default Sort Order in Summary Table.
        $scope.summarySearchObj = '';           // Default Search/Filter Term.

        //getJson( $scope, $http, initUri, setInit );
        $scope.readInitial = function () { createPage( initPage, $scope, $http, initUri, setInit, $translate ); };
        $scope.readSummaryBySID = function ( sid ) { createPage( summaryPage, $scope, $http, 'none', setSummary, $translate, sid ); };
        $scope.readDetail = function ( sid ) { createPage( detailPage, $scope, $http, detailUri, setDetail, $translate, sid ); };
        $scope.getUserInfo = function ( sid ){ createPage( userInfoMode, $scope, $http, userInfoUri, setUserInfo, $translate, sid ); };

        //For Alert Message
        createAlert = function( msgType, msgText ){ 
            $scope.$apply( $scope.alertMessages = [{ type: msgType, msg: $translate.instant( msgText ) }] );
            $uibModal.open({
                templateUrl: "alertMsg",
                scope: $scope
            });
        };
        $scope.closeAlert = function(index) { $scope.alertMessages.splice(index, 1); };

        $scope.readInitial();

    }]); // End of app.controller

    app.controller('ModalCtrlStat', ['$scope', 'statData', function( $scope, statData ){
        $scope.statData = statData.json;
    }]);


    // ==========================================================================
    // Functions out of app.controller scope.
    // ==========================================================================
    initPivotOptions = function () {
        renderOptions = {
            rows: undefined,
            cols: undefined,
            vals: undefined,
            aggregatorName: undefined,
            rendererName: undefined
        };

        filterData = {
            pivotItemName: undefined,
            pivotItemValue: undefined
        };
    };

    createPage = function( mode, scope, http, v_uri, callback, translate, sid ) {

        var jsonData,
            isInitial,
            isSummary,
            isUserInfo
            ;

        // Except for the initial page.
        if ( sid !== undefined ) {
            scope.summaryResults = scope.repoData.filter( function(elem){return elem.SID === sid;} );
            // SID is changes, so the json data is need to be refresh.
            if ( sid !== scope.currentSID ) {
                scope.detailResults = undefined;
                scope.userInfoData = undefined;
            }
            scope.currentSID = sid;
        }
        // SID is not specified. From the detail to initial page.
        else {
            // No sid variant, and no scope.currentSID
            if ( scope.currentSID === undefined ) {
                // This case should not be happened.
            }
            // This should not be happened too?
            else {
                sid = scope.currentSID;
            }
        }

        switch ( mode ) {
            case initPage:
                scope.isBtnInitial = true; scope.isBtnSummary = false; scope.isBtnDetail = false; scope.isBtnUserInfo = false;
                isInitial = true; isSummary = false; isUserInfo = false;
                jsonData = scope.repoData;
                break;
            case summaryPage:
                scope.isBtnInitial = false; scope.isBtnSummary = true; scope.isBtnDetail = false; scope.isBtnUserInfo = false;
                isInitial = false; isSummary = true; isUserInfo = false;
                jsonData = scope.summaryResults; 
                break;
            case detailPage: // Logon User Information.
                scope.isBtnInitial = false; scope.isBtnSummary = false; scope.isBtnDetail = true; scope.isBtnUserInfo = false;
                isInitial = false; isSummary = false; isUserInfo = false;
                jsonData = scope.detailResults;
                v_uri = v_uri + '&sid=' + sid;
                break;
            case userInfoMode:
                scope.isBtnInitial = false; scope.isBtnSummary = false; scope.isBtnDetail = false; scope.isBtnUserInfo = true;
                isInitial = false; isSummary = false; isUserInfo = true;
                jsonData = scope.userInfoData;
                v_uri = v_uri + '&sid=' + sid;
                break;
        }

        if ( jsonData === undefined ) {
            getJson ( scope, http, v_uri, callback, translate );
        }
        else {
            console.log ("JSON Data is already exist and the page has been created once before. So the page creation process is omitted.");

            //callback( scope, jsonData )

            // These changing flags are possible to do in the SWITCH satement above,
            // but if it is executed in the SWITCH statement, showing empty page in a few seconds, 
            // that's why changing flags are exected here.
            if ( isInitial ) {
                handlePageFlags ( scope, initPage ); 
            }
            else if ( isSummary ) {
                handlePageFlags ( scope, summaryPage );
                procSummary( scope );
            }
            else if ( isUserInfo ) {
                handlePageFlags( scope, userInfoMode );
            }
            else {
                handlePageFlags ( scope, detailPage );
                procDetail ( scope );
            }

        }
    };

    getJson = function ( scope, http, v_uri, callback, translate ) {

        var loadProgress,
            transLoad = "progressBar.statMsgLoading",
            transProc = "progressBar.statMsgProcData"
            ;

        pbModalInstance = gUibModal.open({
            templateUrl: "progressBar",
            backdrop: "static",
            scope: scope
        });

        console.log( "Get JSON data from " + v_uri );

        // I don't know why this code is necessary, but without this "translate.instance" does not work.
        translate(transLoad).then( function ( value ){ scope.remotingStatus = value; });
        scope.remotingStatus = translate.instant(transLoad);
        scope.remotingProgress = 0;

        http({
            method: 'GET',
            url: v_uri,
            headers: {
                //'x-requested-with': 'XMLHttpRequest',
                //'x-csrf-token': 'Fetch',
                //'Authorization': 'Basic U1VZQU1BVDp0ZXN0MTIzNA==',
                'Content-Type': 'application/json'                    
            },
            onProgress: function( event ){
                loadProgress = ( event.loaded / event.total ) * 100;
                scope.$apply( scope.remotingProgress = Math.floor(loadProgress) );
                console.log("Loaded " + scope.remotingProgress + "%");
            }
        }).then( function( response ){
            //console.log(response.headers('x-csrf-token'));
            console.log("GET method finished. Next is the processing of JSON data");
            scope.remotingStatus = translate.instant(transProc);
            callback( scope, JSON.parse( JSON.stringify(response.data) ) );
            pbModalInstance.close();
        })
        .catch( function( response ) {
            // Error handling
            console.log( response.data.status );
        });
    };

    getStatJson = function ( v_uri, callback ) {
        gHttpService({
            method: 'GET',
            url: v_uri,
            headers: {
                //'x-requested-with': 'XMLHttpRequest',
                //'x-csrf-token': 'Fetch',
                //'Authorization': 'Basic U1VZQU1BVDp0ZXN0MTIzNA==',
                'Content-Type': 'application/json'                    
            }
        }).then( function( response ){
            //console.log(response.headers('x-csrf-token'));
            console.log("GET method of getStatJson finished. Next is the processing of JSON data");
            callback( JSON.parse( JSON.stringify(response.data) ) );
        })
        .catch( function( response ) {
            // Error handling
            console.log( response.data.status );
        });
    };

    handlePageFlags = function ( scope, mode ) {
        switch ( mode ) {
            case initPage:
                scope.showHdrBtns = false;
                scope.showInit = true; scope.showSummary = false; scope.showDetail = false; scope.showUserInfo = false;
                break;
            case summaryPage:
                scope.showHdrBtns = true;
                scope.showInit = false; scope.showSummary = true; scope.showDetail = false; scope.showUserInfo = false;
                break;
            case detailPage:
                scope.showHdrBtns = true;
                scope.showInit = false; scope.showSummary = false; scope.showDetail = true; scope.showUserInfo = false;
                break; 
            case userInfoMode:
                scope.showHdrBtns = true;
                scope.showInit = false; scope.showSummary = false; scope.showDetail = false; scope.showUserInfo = true;
                break; 
        }
    };

    setInit = function( scope, jsonData ) {
        handlePageFlags ( scope, initPage ); 
        scope.repoData = jsonData; 
        procInit( scope ); 
    };

    setSummary = function( scope, jsonData ) {
        handlePageFlags ( scope, summaryPage ); 
        scope.summaryResults = jsonData; 
        procSummary( scope ); 
    };

    setDetail = function( scope, jsonData ) {
        handlePageFlags ( scope, detailPage ); 
        scope.detailResults = jsonData; 
        procDetail( scope ); 
    };

    setUserInfo = function( scope, jsonData ){
        handlePageFlags( scope, userInfoMode );
        scope.userInfoData = jsonData;
    };

    procInit = function ( scope )
    {
        var recentRepoArray = [],
            addDataSet = {},
            histObj = {},
            recentSID,
            recentDate,
            recentWdynCnt,
            recentWdyaCnt,
            recDateBySID = [],
            graphData = [],
            clientCnt = 1,
            allClntComUsrCnt = 0,
            allClntDiaUsrCnt = 0,
            allClntRefUsrCnt = 0,
            allClntSrvUsrCnt = 0,
            allClntSysUsrCnt = 0,
            allClntLogonUsrs = 0,
            clientCntBySID = [],
            comUsrCntBySID = [],
            diaUsrCntBySID = [],
            refUsrCntBySID = [],
            srvUsrCntBySID = [],
            sysUsrCntBySID = [],
            logonUsrCntBySID = [],
            totalUsrCntBySID = [],
            repoDataLength,
            _pushRecentInfoArray,
            _pushObjCntArray,
            _collectUsers,
            _initializeData
            ;

        scope.repoOptions = { 
            responsive: true,
            scales: {
                yAxes: [{
                    display: true,
                    ticks: {
                        min: 0
                    }
                }],
                xAxes: [{
                    display: true,
                    ticks: {
                        fontSize: 11
                    }
                }],
            },
            elements: {
                line: {
                    fill: false
                }
            }
        };
        scope.repoSeries = [ "All Existing Users", "Logon Users" ];
        scope.repoColors =[ "#ffa500", "#5f9ea0" ];

        repoDataLength = scope.repoData.length - 1;

        _pushRecentInfoArray = function ( sid, recDate, clientCnt, comUsrCnt, diaUsrCnt, refUsrCnt, srvUsrCnt, sysUsrCnt, logonUsrCnt,
                                          dateArray, clientCntArray, comUsrArray, diaUsrArray, refUsrArray, srvUsrArray, sysUsrArray, logonUsrArray, totalUsrArray ) {
            histObj = {
                DATES: dateArray,
                ALL_CLIENTS: clientCntArray,
                COM_USERS: comUsrArray,
                DIA_USERS: diaUsrArray,
                REF_USERS: refUsrArray,
                SRV_USERS: srvUsrArray,
                SYS_USERS: sysUsrArray,
                TOTAL_USERS: totalUsrArray,
                LOGON_USERS: logonUsrArray
            };

            graphData = [ totalUsrArray, logonUsrArray ];

            addDataSet = { SYSTEMID: sid, 
                           RECENT_DATE: recDate,
                           CLIENT_CNT: clientCnt,
                           COM_USER_CNT: comUsrCnt,
                           DIA_USER_CNT: diaUsrCnt,
                           REF_USER_CNT: refUsrCnt,
                           SRV_USER_CNT: srvUsrCnt,
                           SYS_USER_CNT: sysUsrCnt,
                           LOGON_USER_CNT: logonUsrCnt, 
                           HISTORY: histObj,
                           GRAPH_DATA: graphData 
            };

            recentRepoArray.push( addDataSet );
        };

        _pushObjCntArray = function ( recDate, clientCnt, comUsrCnt, diaUsrCnt, refUsrCnt, srvUsrCnt, sysUsrCnt, logonUsrCnt ) {
            recDateBySID.push( recDate );
            clientCntBySID.push( clientCnt );
            comUsrCntBySID.push( comUsrCnt );
            diaUsrCntBySID.push( diaUsrCnt );
            refUsrCntBySID.push( refUsrCnt );
            srvUsrCntBySID.push( srvUsrCnt );
            sysUsrCntBySID.push( sysUsrCnt );
            logonUsrCntBySID.push( logonUsrCnt );
            totalUsrCntBySID.push ( comUsrCnt + diaUsrCnt + refUsrCnt + srvUsrCnt + sysUsrCnt );
        };

        _collectUsers = function ( userType, totalUsers, logonUsers ) {
            switch ( userType ) {
                case comUser:
                    allClntComUsrCnt += totalUsers;
                    break;
                case diaUser:
                    allClntDiaUsrCnt += totalUsers;
                    break;
                case refUser:
                    allClntRefUsrCnt += totalUsers;
                    break;
                case srvUser:
                    allClntSrvUsrCnt += totalUsers;
                    break;
                case sysUser:
                    allClntSysUsrCnt += totalUsers;
                    break;
            }

            allClntLogonUsrs += logonUsers;
        };

        _initializeData = function ( all ) {
            if ( all !== undefined ) {
                recDateBySID = [];
                clientCntBySID = [];
                comUsrCntBySID = [];
                diaUsrCntBySID = [];
                refUsrCntBySID = [];
                srvUsrCntBySID = [];
                sysUsrCntBySID = [];
                logonUsrCntBySID = [];
                totalUsrCntBySID = [];
            }

            clientCnt = 1;
            allClntComUsrCnt = 0;
            allClntDiaUsrCnt = 0;
            allClntRefUsrCnt = 0;
            allClntSrvUsrCnt = 0;
            allClntSysUsrCnt = 0;
            allClntLogonUsrs = 0;
        };


        for ( var i in scope.repoData ){
            // System ID is changed
            if ( i != 0 && scope.repoData[i].SID !== scope.repoData[i -1].SID ) {

                //Set previous row to daily info.
                _pushObjCntArray( scope.repoData[i - 1].SUM_DATE, clientCnt, allClntComUsrCnt, allClntDiaUsrCnt, allClntRefUsrCnt, allClntSrvUsrCnt, allClntSysUsrCnt, allClntLogonUsrs );

                //Set previous SID's information as the recent data.
                _pushRecentInfoArray( scope.repoData[i - 1].SID,
                                      scope.repoData[i - 1].SUM_DATE,
                                      clientCnt,
                                      allClntComUsrCnt,
                                      allClntDiaUsrCnt,
                                      allClntRefUsrCnt,
                                      allClntSrvUsrCnt,
                                      allClntSysUsrCnt,
                                      allClntLogonUsrs,
                                      recDateBySID,
                                      clientCntBySID,
                                      comUsrCntBySID,
                                      diaUsrCntBySID,
                                      refUsrCntBySID,
                                      srvUsrCntBySID,
                                      sysUsrCntBySID,
                                      logonUsrCntBySID,
                                      totalUsrCntBySID );

                _initializeData ( 'all' );
                _collectUsers( scope.repoData[i].USTYP, scope.repoData[i].TOTAL_USERS, scope.repoData[i].LOGON_USERS );
            }
            // The last record.
            else if ( i == repoDataLength ){
                _pushObjCntArray( scope.repoData[i].SUM_DATE, clientCnt, allClntComUsrCnt, allClntDiaUsrCnt, allClntRefUsrCnt, allClntSrvUsrCnt, allClntSysUsrCnt, allClntLogonUsrs );

                _pushRecentInfoArray( scope.repoData[i].SID,
                                      scope.repoData[i].SUM_DATE,
                                      clientCnt,
                                      allClntComUsrCnt,
                                      allClntDiaUsrCnt,
                                      allClntRefUsrCnt,
                                      allClntSrvUsrCnt,
                                      allClntSysUsrCnt,
                                      allClntLogonUsrs,
                                      recDateBySID,
                                      clientCntBySID,
                                      comUsrCntBySID,
                                      diaUsrCntBySID,
                                      refUsrCntBySID,
                                      srvUsrCntBySID,
                                      sysUsrCntBySID,
                                      logonUsrCntBySID,
                                      totalUsrCntBySID );
                
            }
            else {
                // Client is changed, and the date is not changed.
                if ( i != 0
                     && scope.repoData[i].CLIENT !== scope.repoData[i - 1].CLIENT
                     && scope.repoData[i].SUM_DATE == scope.repoData[i - 1].SUM_DATE ) {
                    clientCnt += 1;
                }

                // Date is changed and the client is also changed.
                if ( i != 0 && scope.repoData[i].SUM_DATE !== scope.repoData[i - 1].SUM_DATE ) {
                    _pushObjCntArray( scope.repoData[i - 1].SUM_DATE, clientCnt, allClntComUsrCnt, allClntDiaUsrCnt, allClntRefUsrCnt, allClntSrvUsrCnt, allClntSysUsrCnt, allClntLogonUsrs );
                    _initializeData();
                }

                _collectUsers( scope.repoData[i].USTYP, scope.repoData[i].TOTAL_USERS, scope.repoData[i].LOGON_USERS );

            }
        }

        scope.recentRepoData = recentRepoArray;

    };


    procSummary = function ( scope )
    {
        var comUsrCnt = 0,
            comUsrLogCnt = 0,
            comUsrLockCnt = 0,
            diaUsrCnt = 0,
            diaUsrLogCnt = 0,
            diaUsrLockCnt = 0,
            refUsrCnt = 0,
            refUsrLogCnt = 0,
            refUsrLockCnt = 0,
            srvUsrCnt = 0,
            srvUsrLogCnt = 0,
            srvUsrLockCnt = 0,
            sysUsrCnt = 0,
            sysUsrLogCnt = 0,
            sysUsrLockCnt = 0,
            allClntLogonUsrs = 0,
            dailyInfoObj = {},
            dataSet = {},
            dailyInfoArray = [],
            clientHistArray = [],
            graphDataArray = [],
            _initializeData,
            _getDailyArray,
            _collectUsers,
            _pushDailyInfoByClient,
            _pushRecentInfoByClient,
            repoDataLength
            ;

        scope.clientGraphOptions = { 
            responsive: true,
            scales: {
                yAxes: [{
                    display: true,
                    ticks: {
                        min: 0
                    }
                }],
                xAxes: [{
                    display: true,
                    ticks: {
                        fontSize: 15
                    }
                }],
            },
            elements: {
                line: {
                    fill: false
                }
            }
        };
        scope.clientGraphSeries = [ "Communication Users (C)", "Dialog Users (A)", "Reference Users (L)", "Service Users (S)", "System Users (B)" ];
        scope.clientGraphColors =[ "#ffa500", "#59ff00", "#00d9ff", "#2600ff", "#ff0059" ];

        scope.summaryResults.sort( function(a, b) { 
            if (a.CLIENT < b.CLIENT) return -1;
            if (a.CLIENT > b.CLIENT) return 1;
            if (a.SUM_DATE < b.SUM_DATE) return -1;
            if (a.SUM_DATE > b.SUM_DATE) return 1;
        });

        repoDataLength = scope.summaryResults.length - 1;

        _getDailyArray = function ( clm ) {
            var dailyArray = [];

            for ( var i = 0; i < dailyInfoArray.length; i++ ){
                dailyArray.push( dailyInfoArray[i][clm] );
            }

            return dailyArray;
        }

        _pushRecentInfoByClient = function ( client, recentLogDate ) {

            graphDataArray = [ _getDailyArray( "COM_USR_LOGON" ), 
                               _getDailyArray( "DIA_USR_LOGON" ), 
                               _getDailyArray( "REF_USR_LOGON" ), 
                               _getDailyArray( "SRV_USR_LOGON" ), 
                               _getDailyArray( "SYS_USR_LOGON" ) ];

            dataSet = {
                CLIENT: client,
                RECENT_DATE: recentLogDate,
                RECENT_COM_USR: comUsrCnt,
                RECENT_COM_USR_LOG: comUsrLogCnt,
                RECENT_COM_USR_LOCK: comUsrLockCnt,
                RECENT_DIA_USR: diaUsrCnt,
                RECENT_DIA_USR_LOG: diaUsrLogCnt,
                RECENT_DIA_USR_LOCK: diaUsrLockCnt,
                RECENT_REF_USR: refUsrCnt,
                RECENT_REF_USR_LOG: refUsrLogCnt,
                RECENT_REF_USR_LOCK: refUsrLockCnt,
                RECENT_SRV_USR: srvUsrCnt,
                RECENT_SRV_USR_LOG: srvUsrLogCnt,
                RECENT_SRV_USR_LOCK: srvUsrLockCnt,
                RECENT_SYS_USR: sysUsrCnt,
                RECENT_SYS_USR_LOG: sysUsrLogCnt,
                RECENT_SYS_USR_LOCK: sysUsrLockCnt,                        
                HISTORY: dailyInfoArray,
                GRAPH_DATA: graphDataArray,
                GRAPH_LABEL: _getDailyArray( "DATE" )
            }

            clientHistArray.push( dataSet );
        };

        _pushDailyInfoByClient = function ( logDate ) {
            dailyInfoObj = {
                DATE: logDate,
                COM_USR_TOTAL: comUsrCnt,
                COM_USR_LOGON: comUsrLogCnt,
                COM_USR_LOCK: comUsrLockCnt,
                DIA_USR_TOTAL: diaUsrCnt,
                DIA_USR_LOGON: diaUsrLogCnt,
                DIA_USR_LOCK: diaUsrLockCnt,
                REF_USR_TOTAL: refUsrCnt,
                REF_USR_LOGON: refUsrLogCnt,
                REF_USR_LOCK: refUsrLockCnt,
                SRV_USR_TOTAL: srvUsrCnt,
                SRV_USR_LOGON: srvUsrLogCnt,
                SRV_USR_LOCK: srvUsrLockCnt,
                SYS_USR_TOTAL: sysUsrCnt,
                SYS_USR_LOGON: sysUsrLogCnt,
                SYS_USR_LOCK: sysUsrLockCnt
            };

            dailyInfoArray.push( dailyInfoObj );
        };

        _collectUsers = function ( userType, totalUsers, logonUsers, lockedUsers ) {
            switch ( userType ) {
                case comUser:
                    comUsrCnt = totalUsers;
                    comUsrLogCnt = logonUsers;
                    comUsrLockCnt = lockedUsers;
                    break;
                case diaUser:
                    diaUsrCnt = totalUsers;
                    diaUsrLogCnt = logonUsers;
                    diaUsrLockCnt = lockedUsers;
                    break;
                case refUser:
                    refUsrCnt = totalUsers;
                    refUsrLogCnt = logonUsers;
                    refUsrLockCnt = lockedUsers;
                    break;
                case srvUser:
                    srvUsrCnt = totalUsers;
                    srvUsrLogCnt = logonUsers;
                    srvUsrLockCnt = lockedUsers;
                    break;
                case sysUser:
                    sysUsrCnt = totalUsers;
                    sysUsrLogCnt = logonUsers;
                    sysUsrLockCnt = lockedUsers;
                    break;
            }

        };

        _initializeData = function ( all ) {
            if ( all !== undefined ) {
                dailyInfoArray = [];
            }

            comUsrCnt = 0;
            comUsrLogCnt = 0;
            comUsrLockCnt = 0;
            diaUsrCnt = 0;
            diaUsrLogCnt = 0;
            diaUsrLockCnt = 0;
            refUsrCnt = 0;
            refUsrLogCnt = 0;
            refUsrLockCnt = 0;
            srvUsrCnt = 0;
            srvUsrLogCnt = 0;
            srvUsrLockCnt = 0;
            sysUsrCnt = 0;
            sysUsrLogCnt = 0;
            sysUsrLockCnt = 0;
        };


        for ( var i in scope.summaryResults ){
            // Client is changed
            if ( i != 0 && scope.summaryResults[i].CLIENT !== scope.summaryResults[i -1].CLIENT ) {

                //Set previous row to daily info.
                _pushDailyInfoByClient ( scope.summaryResults[i - 1].SUM_DATE );

                //Set previous Client's information as the recent data.
                _pushRecentInfoByClient ( scope.summaryResults[i - 1].CLIENT, scope.summaryResults[i - 1].SUM_DATE );
                _initializeData( 'all' );

                //Collect data for the current row of new client.
                _collectUsers( scope.summaryResults[i].USTYP, scope.summaryResults[i].TOTAL_USERS, scope.summaryResults[i].LOGON_USERS, scope.summaryResults[i].LOCKED_USERS );
            }
            // The last record.
            else if ( i == repoDataLength ){
                _collectUsers( scope.summaryResults[i].USTYP, scope.summaryResults[i].TOTAL_USERS, scope.summaryResults[i].LOGON_USERS, scope.summaryResults[i].LOCKED_USERS );
                _pushDailyInfoByClient ( scope.summaryResults[i].SUM_DATE );
                _pushRecentInfoByClient ( scope.summaryResults[i].CLIENT, scope.summaryResults[i].SUM_DATE );               
            }
            else {
                // The date is changed, but the client is same. New day in the same client.
                if ( i != 0
                     && scope.summaryResults[i].CLIENT === scope.summaryResults[i - 1].CLIENT
                     && scope.summaryResults[i].SUM_DATE !== scope.summaryResults[i - 1].SUM_DATE ) {
                    
                    _pushDailyInfoByClient ( scope.summaryResults[i - 1].SUM_DATE );
                    _initializeData();

                }

                _collectUsers( scope.summaryResults[i].USTYP, scope.summaryResults[i].TOTAL_USERS, scope.summaryResults[i].LOGON_USERS, scope.summaryResults[i].LOCKED_USERS );

            }
        }

        scope.clientSummary = clientHistArray;

    };

    getUserStat = function( e, value, filters, pivotData ) {
        var procUri,
            exeDate
            ;

        // To avoid unnecessary server access.
        if ( value === null ){ createAlert( "danger", "alert.noValue" ); return; };
        if ( filters.MANDT === undefined ){ createAlert( "danger", "alert.noClient" ); return; };

        procUri = wlStatUri + '&sid=' +  pivotData.input[0].SID;
        procUri = procUri + '&client=' + filters.MANDT;
        procUri = procUri + '&user=' + filters.BNAME;

        if ( filters.TRDAT !== undefined ){
            exeDate = filters.TRDAT;
            procUri = procUri + '&date=' + exeDate.replace( /-/g , "" ); 
        }

        console.log ( 'Called URL: ' + procUri );

        getStatJson( procUri, function( json ){ gUibModal.open({
            templateUrl: 'statInfo',
            controller: 'ModalCtrlStat',
            windowClass: 'modalStatWindow',
            resolve: {
                statData: function(){
                    return { json: json }
                }
            }
            }); 
        });

    };


    procDetail = function ( scope ) 
    {
        var itemUtypBname = ["USTYP", "BNAME"],
            itemMandt = ["MANDT"],
            valueItems = ["COUNTER"]
            ;

        // Reset renderOptions.
        initPivotOptions();

        //Filter set
        filterData.pivotItemName = "SID";
        filterData.pivotItemValue = scope.currentSID;

        // Free selection pivot table
        renderOptions.rows = itemUtypBname;
        renderOptions.cols = itemMandt;
        renderOptions.rendererName = "Heatmap";
        createPivot( scope.detailResults, "#logonUserTab", renderOptions, filterData, getUserStat );

    };

    createPivot = function ( json, divID, renderOptions, filterSet, callback )
    {
        var derivers = $.pivotUtilities.derivers,
            pivotOptions
            ;

        pivotOptions = {
            renderers: $.extend(
                $.pivotUtilities.renderers,
                $.pivotUtilities.c3_renderers
                ),
            rendererOptions: {
                heatmap: {
                    colorScaleGenerator: function( values ) {
                        return d3.scale.linear()
                            .domain( [d3.min(values), d3.max(values)] )
                            .range( ["#ffffff", "#f08080"] )
                    }
                }
            }
        };

        for ( var key in renderOptions ) {
            if ( renderOptions[key] !== undefined ){
                var value = renderOptions[key];
                pivotOptions[key] = renderOptions[key];
            }
        };

        if ( pivotOptions.rendererName.match( /Chart/ ) ){
            pivotOptions.rendererOptions.c3 = { size:{ height: 400, width: 600 } };
            pivotOptions.rendererOptions.c3.color = { pattern: ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'] };
        };

        if ( filterSet.pivotItemName !== undefined ){
            // I don't know why but it is necessary to assign the value to the another variant for correct processing of next statement.
            var item = filterSet.pivotItemName,
                val = filterSet.pivotItemValue;

            pivotOptions.filter = function( record ){ return record[ item ] === val; };
        };

        if ( callback !== undefined ){
            pivotOptions.rendererOptions.table = { clickCallback: callback };
        }

        // Generating Pivot with "Overwrite" option = true.
        $(divID).pivotUI( json, pivotOptions, true );

    };

})();
