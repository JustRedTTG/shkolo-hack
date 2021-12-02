let testMaxDurationInSec = $('#testMaxDurationInSec').val(),
    testExecutionStartTime = new Date($('#testExecutionStartTime').val()),
    executionTimeRemainingInSec = $('#executionTimeRemainingInSec').val(),
    testId = $('#testId').val(),
    testExecutionId = $('#testExecutionId').val(),
    currentQuestion = $('#currentQuestionId'),
    previousQuestion = $('#previousQuestionId'),
    testCountdown = $('#testCountdown'),
    questionCountdown = $('#questionCountdown'),
    questionsInfo = [],
    nextBtn = $('#nextQuestion'),
    prevBtn = $('#previousQuestion');

let testCountDownTimer = 0,
    questionCountDownTimer = 0;

// Flag that indicates whether test taker can edit an answer once it was submitted.
let testAnswersCanBeCorrected = parseInt($('#userCanCorrectAnswers').val() ? $('#userCanCorrectAnswers').val() : 1) === 1;

// Counter for how much time is left (in seconds) for the solving of the current question.
let questionExecutionTimeRemainingInSec = 0;

// Flag to check if the time for the current question has expired.
let questionTimeRanOut = 0;

var testExecution =
    {
        initTestCountdown: function () {
            var testExecutionTimeRemainingInSec = Math.ceil(executionTimeRemainingInSec);

            testCountDownTimer = setInterval(function timer() {
                testCountdown.text(testExecution.getCountdownTimeText(testExecutionTimeRemainingInSec));
                if (testExecutionTimeRemainingInSec <= 0) {
                    clearInterval(testCountDownTimer);
                    testExecution.finishTest();
                } else {
                    --testExecutionTimeRemainingInSec;
                }
            }, 1000);
        },
        initQuestionCountdown: function () {
            // Update the question time limit before starting timer again.
            testExecution.setCurrentQuestionTimeLimit();
            clearInterval(questionCountDownTimer);

            if (questionsInfo[currentQuestion.val()]['is_timed']) {
                questionCountDownTimer = setInterval(function timer() {
                    questionCountdown.text(testExecution.getCountdownTimeText(questionExecutionTimeRemainingInSec));

                    // If the timer is 0 or less then redirect user to another question. If all other questions are locked
                    // then finish the test.
                    if (questionExecutionTimeRemainingInSec === 0 || questionExecutionTimeRemainingInSec < 0) {
                        clearInterval(questionCountDownTimer);
                        questionTimeRanOut = 1;

                        var allFollowingQuestionsAreLocked = nextBtn.prop('disabled') || nextBtn.is(":hidden");
                        var allPrevQuestionsAreLocked = prevBtn.prop('disabled') || prevBtn.is(":hidden");

                        if (!allFollowingQuestionsAreLocked) {
                            nextBtn.trigger('click');
                        } else if (!allPrevQuestionsAreLocked) {
                            prevBtn.trigger('click');
                        } else {
                            testExecution.finishTest();
                        }
                    } else {
                        --questionExecutionTimeRemainingInSec;
                    }
                }, 1000);
            }
        },
        getCountdownTimeText: function (timeInSec) {
            var hours = Math.floor(timeInSec / 3600);
            var minutes = Math.floor(timeInSec % 3600 / 60);
            var seconds = Math.floor(timeInSec % 3600 % 60);
            hours = hours < 0 ? "00" : (hours < 10 ? "0" + hours : hours);
            minutes = minutes < 0 ? "00" : (minutes < 10 ? "0" + minutes : minutes);
            seconds = seconds < 0 ? "00" : (seconds < 10 ? "0" + seconds : seconds);

            return hours + ":" + minutes + ":" + seconds;
        },
        testExecutionAnswersObject: function (id, num, short, long) {
            this.test_question_answer_id = id;
            this.response_numeric = num;
            this.response_text_short = short;
            this.response_text_long = long;
        },
        testExecutionAnswers: function (questionId) {
            var answers = [];
            $("[name=" + questionId + "]").each(function () {
                if (($(this).is(':radio') || $(this).is(':checkbox')) && $(this).is(':checked')) {
                    answers.push(new testExecution.testExecutionAnswersObject(this.id));
                } else if ($(this).is(':text') && $(this).val() !== '') {
                    answers.push(new testExecution.testExecutionAnswersObject(this.id, null, $(this).val()));
                } else if ($(this).is('[type=number]') && $(this).val() !== '') {
                    answers.push(new testExecution.testExecutionAnswersObject(this.id, $(this).val()));
                } else if ($(this).is('textarea') && $(this).val() !== '') {
                    answers.push(new testExecution.testExecutionAnswersObject(this.id, null, null, $(this).val()));
                }
            });
            return answers;
        },
        questionPagination: function () {
            var pagination = $('#questionPagination');
            pagination.on('click', 'a', function () {
                var prevActiveLi = pagination.find('.active');
                if (!$(this).parent().hasClass('active')) {
                    var num = $(this).data('questionnum'),
                        currentQuestionId = currentQuestion.val(),
                        question = $('#questionNum_' + num),
                        nextQuestionId = question.data('id');

                    // If the same question id, then no action is required. Otherwise go to next question.
                    if (parseInt(nextQuestionId) !== parseInt(currentQuestionId)) {
                        var isRequired = parseInt(questionsInfo[currentQuestionId]['is_required']) === 1;
                        var isAnswered = testExecution.testExecutionAnswers(currentQuestion.val()).length > 0;

                        if(isRequired && !isAnswered && !questionTimeRanOut){
                            utils.showToastrMessage("Р’СЉРїСЂРѕСЃСЉС‚ Рµ Р·Р°РґСЉР»Р¶РёС‚РµР»РµРЅ. Р’СЉРІРµРґРµС‚Рµ РѕС‚РіРѕРІРѕСЂ!", 'error', 1000);
                        }
                        else{
                            // Update current and previous questions. (NB: needs to be set prior to the POST AJAX request).
                            previousQuestion.val(currentQuestionId);
                            currentQuestion.val(nextQuestionId);

                            // Post question answers.
                            testExecution.questionExecution();
                            $('.question:visible').hide();
                            question.show();

                            // Update pagination buttons.
                            prevActiveLi.removeClass('active answered').addClass(isAnswered.length ? 'answered' : '');
                            $(this).parent().removeClass('answered').addClass('active');
                            $(this).parent().is(':first-child') ? prevBtn.hide() : prevBtn.show();
                            $(this).parent().is(':last-child') ? nextBtn.hide() : nextBtn.show();
                        }

                    }
                }
            });
            nextBtn.on('click', function () {
                // Since the next one or several questions might be locked we need to check which is the next questions
                // the user can navigate to.
                var activePage = pagination.find('.active');
                var nextQuestionLink = testExecution.getNextQuestionLink(nextBtn, activePage, "next");

                if (nextQuestionLink) {
                    nextQuestionLink.trigger('click');
                }
            });
            prevBtn.on('click', function () {
                // Since the previous one or several questions might be locked we need to check which is the next questions
                // the user can navigate to.
                var activePage = pagination.find('.active');
                var prevQuestionLink = testExecution.getNextQuestionLink(prevBtn, activePage, "prev");

                if (prevQuestionLink) {
                    prevQuestionLink.trigger('click');
                }
            });
        },
        /**
         * Get the next link (question) the user can navigate to since some of them might be locked.
         *
         * @param button
         * @param activePage
         * @param direction
         * @returns {null|*}
         */
        getNextQuestionLink: function (button, activePage, direction) {
            var nextPage, nextQuestionLink, questionPageAfterNext;

            if (direction === 'next') {
                nextPage = activePage.next();
                nextQuestionLink = nextPage.find('a');
                questionPageAfterNext = nextPage.next();
            } else {
                nextPage = activePage.prev();
                nextQuestionLink = nextPage.find('a');
                questionPageAfterNext = nextPage.prev();
            }

            if (nextQuestionLink.hasClass('disabled')) {
                // If the next questions is locked and there is no question after the next one then do not move user
                // from current question.
                if (!questionPageAfterNext || !questionPageAfterNext.is( "li" )) {
                    return null;
                }

                // If the next question and the one after are both dissabled then call this method again to search even
                // deeper in the questions tree.
                if (questionPageAfterNext.find('a').hasClass('disabled')) {
                    return testExecution.getNextQuestionLink(button, nextPage, direction);
                }

                nextQuestionLink = questionPageAfterNext.find('a');
            }

            return nextQuestionLink;
        },
        /**
         * Send a request to the server to retrieve useful information for test questions.
         */
        getQuestionsInfo: function () {
            if (!testId || !testExecutionId) {
                return;
            }

            var requestParams = {
                'test_id': testId,
                'test_execution_id': testExecutionId
            };
            $.ajax({
                method: "GET",
                url: '/ajax/test/getQuestionsInfo',
                data: requestParams
            })
            .success(function (data) {
                questionsInfo = data;
                testExecution.lockQuestions();
                testExecution.initQuestionCountdown();
                testExecution.updateQuestionAnswersLockedStatus(currentQuestion.val());
                testExecution.attachMultichoiceQuestionsAnswersListener();
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                // Status code of 406 means that the server determined the test was already finished.
                if (jqXHR.status === 406) {
                    utils.showToastrMessage('РўРѕР·Рё С‚РµСЃС‚ Рµ РІРµС‡Рµ РїСЂРёРєР»СЋС‡РµРЅ Рё РЅРµ РјРѕР¶Рµ РґР° Р±СЉРґРµ РјРѕРґРёС„РёС†РёСЂР°РЅ.', 'error');
                } else if (jqXHR.status === 401) {
                    utils.showToastrMessage('РЎРµСЃРёСЏС‚Р° РІРё РёР·С‚РµС‡Рµ. РџСЂРѕРґСЉР»Р¶РµС‚Рµ С‚РµСЃС‚Р° СЃР»РµРґ РІСЉРІРµР¶РґР°РЅРµ РЅР° РґР°РЅРЅРёС‚Рµ Р·Р° РІС…РѕРґ.', 'error');
                } else {
                    utils.showToastrMessage('Р“СЂРµС€РєР°! РћРїРёС‚Р°Р№ РїР°Рє.', 'error');
                }
            });
        },
        /**
         * Go through each question and lock them for viewing/editing if needed.
         */
        lockQuestions: function () {
            var currentQuestionId = currentQuestion.val();
            var lockLeftNavigationButton = true;
            var lockRightNavigationButton = true;

            // If the test answers cannot be edited then get the user answers from the browser cache. We will need them
            // a bit later to determine which questions are to be locked for editing/viewing.
            if (!testAnswersCanBeCorrected) {
                var userAnswers = JSON.parse(localStorage.getItem('test_execution_id_' + testExecutionId + '_user_answers'));
                if (userAnswers == null) {
                    userAnswers = {};
                }
            }

            // Lock the current question if is timed. This is because we will be moving from it to another question now.
            if (currentQuestionId != null && questionsInfo[currentQuestionId]['is_timed']) {
                questionsInfo[currentQuestionId]['is_locked'] = true;
            }

            // Go through each question (the test navigation buttons containing the question numbers)
            $(".question-hyperlink").each(function () {
                var hyperlinkQuestionId = $(this).data("question-id");

                if (!testAnswersCanBeCorrected) {
                    // Check in both the cache and the UI whether the question is answered. We check in both just in case
                    // the user cache was deleted or the browser does not support it.
                    var questionIsAnswered = (userAnswers[hyperlinkQuestionId] && userAnswers[hyperlinkQuestionId].length)
                        || testExecution.testExecutionAnswers(hyperlinkQuestionId).length > 0;

                    // If the question was already locked or if the test answeres cannot be edited and the question is already
                    // answered then lock it.
                    questionsInfo[hyperlinkQuestionId]['is_locked'] = questionsInfo[hyperlinkQuestionId]['is_locked'] || questionIsAnswered;
                }

                if (questionsInfo[hyperlinkQuestionId]['is_locked']) {
                    $(this).addClass('disabled');
                } else {
                    // If the question of the loop is not locked and is of lower order then the current one then that means
                    // there are questions to the left of the current one the user can navigate to: unlock the left navigation
                    // button.
                    if (questionsInfo[hyperlinkQuestionId]['order_num'] < questionsInfo[currentQuestionId]['order_num']) {
                        lockLeftNavigationButton = false;
                    }
                    // If the question of the loop is not locked and is of higher order then the current one then that means
                    // there are questions to the right of the current one the user can navigate to: unlock the right navigation
                    // button.
                    if (questionsInfo[hyperlinkQuestionId]['order_num'] > questionsInfo[currentQuestionId]['order_num']) {
                        lockRightNavigationButton = false;
                    }
                }
            });

            prevBtn.attr('disabled', lockLeftNavigationButton);
            nextBtn.attr('disabled', lockRightNavigationButton);
        },
        questionExecution: function () {
            $('#finishTest').attr('disabled', true);
            nextBtn.attr('disabled', true);
            prevBtn.attr('disabled', true);
            $('.pagination a').addClass('disabled');

            // Store the user answer before sending the request. In this way, if the user loses connection for some reason
            // when he gets back to the test his answer will not be lost.
            testExecution.storeUserAnswer(previousQuestion.val(), testExecution.testExecutionAnswers(previousQuestion.val()));
            var requestParams = {
                'next_question_id': currentQuestion.val(),
                'previous_question_id': previousQuestion.val(),
                'current_question_answers': testExecution.testExecutionAnswers(previousQuestion.val()),
                'question_time_ran_out': questionTimeRanOut,
                'test_id': testId,
                'test_execution_id': testExecutionId
            };
            $.ajax({
                method: "POST",
                url: '/ajax/test/questionExecution',
                data: requestParams
            })
            .success(function () {
                $('#finishTest').attr('disabled', false);
                nextBtn.attr('disabled', false);
                prevBtn.attr('disabled', false);
                $('.pagination a').removeClass('disabled');
                testExecution.fillUserAnswer(currentQuestion.val());
                //Reset flag
                questionTimeRanOut = 0;
                // Update which questions are locked for editing (in case the user got cheeky and removed the "disabled"
                // property from the navigation buttons)
                testExecution.lockQuestions();
                // Reset and restart the question time countdown for the new questions.
                testExecution.initQuestionCountdown();
                testExecution.updateQuestionAnswersLockedStatus(currentQuestion.val());
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                // Status code of 406 means that the server determined the test was already finished.
                if (jqXHR.status === 406) {
                    utils.showToastrMessage('РўРѕР·Рё С‚РµСЃС‚ Рµ РІРµС‡Рµ РїСЂРёРєР»СЋС‡РµРЅ Рё РЅРµ РјРѕР¶Рµ РґР° Р±СЉРґРµ РјРѕРґРёС„РёС†РёСЂР°РЅ.', 'error');
                } else if (jqXHR.status === 401) {
                    utils.showToastrMessage('РЎРµСЃРёСЏС‚Р° РІРё РёР·С‚РµС‡Рµ. РџСЂРѕРґСЉР»Р¶РµС‚Рµ С‚РµСЃС‚Р° СЃР»РµРґ РІСЉРІРµР¶РґР°РЅРµ РЅР° РґР°РЅРЅРёС‚Рµ Р·Р° РІС…РѕРґ.', 'error');
                } else {
                    utils.showToastrMessage('Р“СЂРµС€РєР°! РћРїРёС‚Р°Р№ РїР°Рє.', 'error');
                }
            });
            return requestParams.current_question_answers;
        },
        /**
         *  Update the time limit for the newly selected question. If the questions has no time limit then hide the counter.
         */
        setCurrentQuestionTimeLimit: function () {
            if (questionsInfo && currentQuestion.val()) {
                var nextQuestionTimeLimit = questionsInfo[currentQuestion.val()]['time_remaining_in_sec'];

                questionExecutionTimeRemainingInSec = nextQuestionTimeLimit ? nextQuestionTimeLimit : 0;
                if (nextQuestionTimeLimit == 0) {
                    $('.exec-question-remaining-time').addClass('hidden')
                } else {
                    $('.exec-question-remaining-time').removeClass('hidden')
                }
            }
        },
        endingTheTest: function () {
            $('#finishTest').on('click', function () {
                if (confirm("РЎРёРіСѓСЂРЅРё Р»Рё СЃС‚Рµ, С‡Рµ Р¶РµР»Р°РµС‚Рµ РґР° РїСЂРёРєР»СЋС‡РёС‚Рµ С‚РµСЃС‚Р°?")){
                    testExecution.finishTest();
                    testCountdown.text('РљСЂР°Р№ РЅР° С‚РµСЃС‚Р°.');
                    clearInterval(testCountDownTimer);
                }
            });
        },
        finishTest: function () {
            $('#finishTest').attr('disabled', true);
            nextBtn.attr('disabled', true);
            prevBtn.attr('disabled', true);

            $('.pagination a').addClass('disabled');
            var requestParams = {
                'previous_question_id': currentQuestion.val(),
                'current_question_answers': testExecution.testExecutionAnswers(currentQuestion.val()),
                'question_time_ran_out': questionTimeRanOut,
                'test_id': testId,
                'test_execution_id': testExecutionId
            };
            $.ajax({
                method: "POST",
                url: '/ajax/test/finishTest',
                data: requestParams,
                dataType: 'html'
            })
            .success(function () {
                // Reset flag.
                questionTimeRanOut = 0;
                $('.portlet-body').html($('#finishTestExecutionBlock').html());
                setInterval(function(){ window.location.href = '/test/results'; }, 1500);

                // The test ended successfully so delete the user answers for it from the local storage.
                localStorage.removeItem('test_execution_id_' + testExecutionId + '_user_answers');
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                // Status code of 406 means that the server determined the test was already finished.
                if (jqXHR.status === 406) {
                    utils.showToastrMessage('РўРѕР·Рё С‚РµСЃС‚ Рµ РІРµС‡Рµ РїСЂРёРєР»СЋС‡РµРЅ Рё РЅРµ РјРѕР¶Рµ РґР° Р±СЉРґРµ РјРѕРґРёС„РёС†РёСЂР°РЅ.', 'error');
                } else if (jqXHR.status === 401) {
                    utils.showToastrMessage('РЎРµСЃРёСЏС‚Р° РІРё РёР·С‚РµС‡Рµ. РџСЂРѕРґСЉР»Р¶РµС‚Рµ С‚РµСЃС‚Р° СЃР»РµРґ РІСЉРІРµР¶РґР°РЅРµ РЅР° РґР°РЅРЅРёС‚Рµ Р·Р° РІС…РѕРґ.', 'error');
                } else {
                    utils.showToastrMessage('Р“СЂРµС€РєР° РїСЂРё РїСЂРµРґР°РІР°РЅРµ РЅР° С‚РµСЃС‚Р°.', 'warning');
                }
            })
        },
        openThumbnailView: function () {
            var modal = $('#thumbnailViewModal'),
                modalImg = $('#thumbnailViewImg'),
                captionText = $('#thumbnailViewCaption');
            $('.withThumbnailView').on('click', function (ev) {
                modal.show();
                modalImg.attr('src', this.src);
                captionText.html(this.alt);

                // If the image is attached to an answer we dont want clicking the image preview to also accidentally
                // mark the answer.
                ev.preventDefault();
                ev.stopPropagation();
            });
            $('#thumbnailViewModal,#closeThumbnailView').on('click', function (e) {
                if (e.target === this) {
                    modal.hide();
                }
            });
        },
        questionEvaluationValidation: function () {
            var firstEvalInput = $('.evaluation-points-input').first();
            pulsate.attachPulsateOnceHandler(firstEvalInput, null, 4);
            $('#evaluationTestForm').on('submit', function (ev) {
                $('.question-points-input-eval').each(function(){
                    var typedValue = parseFloat($(this).val());
                    var maxValue = parseFloat($(this).data('max'));

                    // Detect errors.
                    var hasError = false;
                    if (utils.isEmpty($(this).val())) {
                        utils.showToastrMessage('Р’СЃРёС‡РєРё РІСЉРїСЂРѕСЃРё С‚СЂСЏР±РІР° РґР° Р±СЉРґР°С‚ РѕС†РµРЅРµРЅРё.', 'warning');
                        hasError = true;
                    }
                    else if (isNaN(typedValue)) {
                        utils.showToastrMessage('РџРѕР»РµС‚Рѕ "РўРѕС‡РєРё" РјРѕР¶Рµ РґР° СЃСЉРґСЉСЂР¶Р° РµРґРёРЅСЃС‚РІРµРЅРѕ С‡РёСЃР»РѕРІР° СЃС‚РѕР№РЅРѕСЃС‚.', 'warning');
                        hasError = true;
                    }
                    else if (typedValue < 0) {
                        utils.showToastrMessage('РџРѕР»РµС‚Рѕ "РўРѕС‡РєРё" РЅРµ РјРѕР¶Рµ РґР° СЃСЉРґСЉСЂР¶Р° РѕС‚СЂРёС†Р°С‚РµР»РЅР° СЃС‚РѕР№РЅРѕСЃС‚.', 'warning');
                        hasError = true;
                    }
                    else if (typedValue > maxValue) {
                        utils.showToastrMessage('РџРѕР»РµС‚Рѕ "РўРѕС‡РєРё" РЅРµ РјРѕР¶Рµ РґР° СЃСЉРґСЉСЂР¶Р° СЃС‚РѕР№РЅРѕСЃС‚ РїРѕ-РіРѕР»СЏРјР° РѕС‚ РјР°РєСЃРёРјР°Р»РЅР°С‚Р°.', 'warning');
                        hasError = true;
                    }

                    // If error exists, then stop form submission and color the invalid input field.
                    if(hasError){
                        ev.preventDefault();
                        utils.loaderHide();
                        $(this).css('border-color', 'red');
                        $(this).css('color', 'red');
                    }
                });
            });
        },
        fillUserAnswer: function ($questionId) {
            // On Safari (private browsing mode) there is no localStorage.
            if (typeof Storage !== 'undefined') {
                try {
                    var userAnswers = JSON.parse(localStorage.getItem('test_execution_id_' + testExecutionId + '_user_answers'));
                } catch (e) {
                    return false;
                }
                if (userAnswers == null) {
                    return;
                }
                var questionAnswer = userAnswers[$questionId];
                if (questionAnswer == null || questionAnswer.length === 0) {
                    return;
                }
                $("[name=" + $questionId + "]").each(function () {
                    if ($(this).is(':radio') || $(this).is(':checkbox')) {

                        // If the anwser ID exists in the array of user anwsers then check it, otherwise uncheck it.
                        (questionAnswer.some(anws => anws.test_question_answer_id === $(this).attr('id')))
                            ? $(this).prop("checked", true) : $(this).prop("checked", false);
                    } else if ($(this).is(':text')) {
                        $(this).val(questionAnswer[0]["response_text_short"]);
                    } else if ($(this).is('[type=number]')) {
                        $(this).val(questionAnswer[0]["response_numeric"]);
                    } else if ($(this).is('textarea')) {
                        $(this).val(questionAnswer[0]["response_text_long"]);
                    }
                });
            }
        },
        storeUserAnswer : function($questionId, $answer) {
            if (typeof Storage !== 'undefined') {
                try {
                    var userAnswers = JSON.parse(localStorage.getItem('test_execution_id_' + testExecutionId + '_user_answers'));
                    if (userAnswers == null) {
                        userAnswers = {};
                    }
                    userAnswers[$questionId] = $answer;
                    localStorage.setItem('test_execution_id_' + testExecutionId + '_user_answers', JSON.stringify(userAnswers));
                } catch (e) {
                    return false;
                }
            }
        },

        /**
         * The listener checks how many answers the user selected and if we need to stop him from selecting any more
         * (depending on the "max_markable_answers" parameter of the question)
         */
        attachMultichoiceQuestionsAnswersListener: function () {
            $('.question').each(function () {
                var questionInfo = questionsInfo[$(this).data('id')];
                if (questionInfo && questionInfo['test_question_type_id'] == 2 && questionInfo['max_markable_answers'] > 0) {
                    $(this).on('click', '.exec-question-answer', function (event) {
                        // We want to ignore click events on anything that is not an "input" type element (the checkbox)
                        if (event.target.tagName.toUpperCase() !== "INPUT") {
                            return;
                        }
                        var questionId = parseInt($(this).find('input').prop('name'));
                        questionId = questionId ? questionId : 0;
                        testExecution.updateQuestionAnswersLockedStatus(questionId, $(this));
                    });
                }
            });
        },

        /**
         * Updates the locked (disabled) status of question answers based on the following cases:
         *      1. If the users number of selected answers is lower than the max allowed then unlock all answers for selection
         *      2. If the users number of selected answers is the same as the max allowed then lock all other not-selected
         *      answers.
         *      3. If the users number of selected answers is higher that the max allowed (will happen in case of bug or
         *      if he manually removes the disabled property of a locked answer) then unselect the newly selected answer.
         *
         * @param questionId
         * @param questionAnswersContainer      The ".exec-question-answer" parent element.
         */
        updateQuestionAnswersLockedStatus: function(questionId, questionAnswersContainer = null) {
            var questionInfo = questionsInfo[questionId];
            questionAnswersContainer = questionAnswersContainer ?  questionAnswersContainer
                : $('.question[data-id="'+ questionId +'"]').find('.exec-question-answer');
            if (questionId && questionInfo && questionAnswersContainer) {
                var maxAnswersNumber = questionInfo['max_markable_answers'];
                if (maxAnswersNumber > 0) {
                    var selectedAnswers = testExecution.testExecutionAnswers(questionId);
                    var selectedAnswersCount = selectedAnswers.length;
                    var allAnswers = questionAnswersContainer.find('input');
                    if (selectedAnswersCount == maxAnswersNumber) {
                        var notSelectedAnswers = testExecution.getCurrentQuestionNotSelectedAnswers(allAnswers, selectedAnswers);
                        notSelectedAnswers.each(function (notSelectedAnswer) {
                            $(this).parent().attr('disabled', true);
                            $(this).parent().addClass('disabled-question-answer');
                        });
                    } else if (selectedAnswersCount > maxAnswersNumber) {
                        var lastSelectAnswerId = selectedAnswers.pop()['test_question_answer_id'];
                        questionAnswersContainer.find("input[id='" + lastSelectAnswerId + "']").prop('checked', false);
                    } else {
                        allAnswers.each(function () {
                            $(this).parent().attr('disabled', false);
                            $(this).parent().removeClass('disabled-question-answer');
                        });
                    }
                }
            }
        },

        /**
         * Get an array of element objects of type "input checkbox" for all answers the user has not selected.
         *
         * @param allQuestionAnswers    array of element objects of type "input checkbox" for all question answers
         * @param selectedQuestionAnswers   Array of selected answers that comes from the "testExecution.testExecutionAnswers()" method
         * @returns {*}
         */
        getCurrentQuestionNotSelectedAnswers: function (allQuestionAnswers, selectedQuestionAnswers) {
            $.each(selectedQuestionAnswers, function (index, selectedAnswer) {
                $.each(allQuestionAnswers, function (index2, answer) {
                    if (answer && selectedAnswer['test_question_answer_id'] == answer.id) {
                        allQuestionAnswers.splice(index2, 1);
                    }
                });
            });

            return allQuestionAnswers;
        },
        handleMathField: function () {
            //Set math-filed in question title non editable
            $('math-field').each(function(index, field){
                field.setOptions({
                    readOnly: true,
                });
            });
        },
        handleMathTitles: function () {
            if($('math-field').length > 0){
                $('._math-question-text').removeClass("_math-question-text").addClass("math-question-text");
            }
        },
        //.question-text ._math-question-text
        init: function () {
            this.getQuestionsInfo();
            this.initTestCountdown();
            this.questionPagination();
            this.openThumbnailView();
            this.endingTheTest();
            this.questionEvaluationValidation();
            this.fillUserAnswer(currentQuestion.val());
            this.handleMathField();
            this.handleMathTitles();
        }
    };
testExecution.init();
