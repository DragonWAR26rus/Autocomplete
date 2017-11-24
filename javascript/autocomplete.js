;
'use strict'

var list 		= $("#list")[0];		// List
var cityField 	= $("#city-field")[0];	// Input

var massOfWords = [];		// Список слов, загружаемый с сервера
var findedWords = [];		// Список совпадений
var findedId = null;		// ID города
var countOfListRecord = 5;	// Количество создаваемых элементов для списка

var selectedRecord = null;			// Объект выделенной записи
var chosenRecord   = null;			// Объект, на который "кликнули". Что бы увидеть требуется показать список когда input в состоянии filled

var listDeploymentToBottom	= true;	// true - список "растет" снизу от input, false - сверхну
var listHeight				= 0;	// Выоста списка.

var requestError = false;	// Ошибка при запросе списка. Вероятно, сервер выключен.
var oldInputValue = "";		// Переменная, требующася для запоминания input.value

const startOfRegExp_withoutEntering = "^(\\s|^|\\(|\\\"|\\\\')";	// Для поиска без вхожедния
const startOfRegExp_withEntering =  "(\\s|^|\\(|\\\"|\\\\')";		// Для поиска по вхождению
var startOfRegExp = startOfRegExp_withEntering;						// Для переключения поменять переменную
const recordHeight = 25; // Высота одной записи
const promptHeight = 71; // Высота подсказки

const warningString = "Значения в справочнике нет.<br>Возможно, вы ошиблись в написании";
const errorString   = "Выберите значение из списка";
const requestErrorString = "Что-то пошло не так. Проверьте соединение с интернетом и попробуйте еще раз";
const notFoundRecord = {
	"Id": "-1",
	"City": "Не найдено"
};

// Загрузить массив данных
$(document).ready(function(){
	$.getJSON("./kladr.json", function(json) {
		massOfWords = json;
		requestError = false;
	}).fail(function(){
		// В случае ошибки запроса указываем выводить сообщение об ошибке
		requestError = true;
	});
});

// Экранирование символов для регуляного выражения
function shieldingSymbols (sub){
	sub = sub.replace(/\\/g, "\\\\");
	sub = sub.replace(/\//g, "\\\/");
	sub = sub.replace(/([().^|?*[\]])/g, "\\$1");
	return sub;
}

// Генерация блока с кнопкой обновления старницы при ошибке запроса
function genErrLink(){
	$(".list-cities>li").remove();
	$(list).append("<li class='list-cities-prompt' style='max-width:270px'><div class='prompt'>" + requestErrorString + "</div></li>");
	selectedRecord = $(list).append("<li class='list-cities-item'><a class='list-cities-err-request-link selected' href=''>Обновить</a></li>").find('a')[0];
}

// Переключение состояний input
function switchInputStatus(status){

	if(status === "error"){
		if(!cityField.classList.contains("filled") && cityField.value.length !== 0){
			$(cityField).removeClass("focus filled warning");
			$(list).addClass("hidden");
			$(".id-value").removeClass("filled").addClass("error").html(errorString).css("top", 24 + "px");
			$(cityField).addClass(status);
		}
		return;
	}

	$(cityField).removeClass("error warning");
	$(".id-value").removeClass("error warning");
	
	if(status !== "focus"){
		$(cityField).removeClass("filled");
		$(".id-value").removeClass("filled");
	}

	if(status === "default"){ 
		return;
	}

	if(status === "filled"){
		$(list).addClass("hidden");
		$(".id-value").addClass("filled").html("ID населенного пункта: " + findedId).css("top", 24 + "px");
	}


	if(status === "warning"){
		$(cityField).addClass("warning");
		$(".id-value").addClass("warning").html(warningString).css("top", (listDeploymentToBottom ? 51 : 24) + "px");
	}

	$(cityField).addClass(status);
}

// Генерация списка
function linksGen(list, mass){
	// Удаление старого списка
	$(".list-cities-item").remove();
	$(".list-cities-prompt").remove();

	if(!mass) return 0;
	// Динамическое изменение количества элементов в списке в зависимости от количества пикселей до края окна
	let inputPosition = $(cityField).offset().top + $(cityField).height();
	let windowBottomPosition = $(window).scrollTop() + $(window).height();
	let recordMaxSize = Math.floor((windowBottomPosition - inputPosition - promptHeight)/recordHeight);
	recordMaxSize = recordMaxSize < 5 ? 5 : (recordMaxSize > 20 ? 20 : recordMaxSize); 

	if((windowBottomPosition - inputPosition < 200)&&(mass.length !== 0)){
		listDeploymentToBottom = false;
		recordMaxSize = Math.floor( ($(cityField).offset().top - $(window).scrollTop() - promptHeight) / recordHeight );
		recordMaxSize = recordMaxSize > 20 ? 20 : (recordMaxSize < 5 ? 5 : recordMaxSize);
	}else{
		listDeploymentToBottom = true;
	}
		countOfListRecord = mass.length > 250 ? recordMaxSize : mass.length < 150 ? 5 : recordMaxSize;

	// Генерация нового списка
	if(mass.length !== 0){
		let recordCount = 0;
		for(let i = 0; mass[i] && (i < countOfListRecord); i++, recordCount++){

			let li = document.createElement("li");
			let a = document.createElement("a");
			$(li).addClass("list-cities-item");
			$(a).addClass("list-cities-link").attr({"city-id":mass[i].Id});
			
			if(i === 0){ // Если первый элемент в списке
				$(a).addClass("selected");
				selectedRecord = a;
			}
			
			
			// Выделение при поиске по вхождению
			let sub = cityField.value;
			let substrPosition = mass[i].City.search(new RegExp(startOfRegExp+shieldingSymbols(sub), "i"));
			if(substrPosition !== mass[i].City.search(new RegExp(startOfRegExp, "i"))){
				substrPosition++;
			}
			$(a).html(mass[i].City.substring(0, substrPosition) + "<b>" + 
				mass[i].City.substring(substrPosition, substrPosition + sub.length) + "</b>" + 
				mass[i].City.substring(substrPosition + sub.length));

			$(li).append(a);
			if(listDeploymentToBottom){
				$(list).append(li);
			}else{
				$(list).prepend(li);
			}
		}

		// Если есть записи, не попавшие в список, то добавим подсказку
		if(recordCount < mass.length){
			listHeight = recordHeight * countOfListRecord + promptHeight;
			let li = document.createElement("li");
			let prompt = document.createElement("div");
		
			$(li).addClass("list-cities-prompt");
			$(prompt).addClass("prompt");
			$(prompt).html("Показано " + recordCount + " из " + mass.length + " найденных городов. Уточните запрос, чтобы увидеть остальные");
			$(li).append(prompt);
			if(listDeploymentToBottom){
				$(list).append(li);
			}else{
				$(list).prepend(li);
			}
		}else{
			listHeight = recordHeight * countOfListRecord;
		}
	}else{
		// Если совпадений не найдено
		switchInputStatus("warning");
		selectedRecord = null;
		listHeight = recordHeight * countOfListRecord;

		let li = document.createElement("li");
		let a = document.createElement("a");
		$(a).addClass("list-cities-link not-found").attr({"city-id":notFoundRecord.Id}).html(notFoundRecord.City);
		$(li).addClass("list-cities-item").append(a);
		
		if(listDeploymentToBottom){
			$(list).append(li);
		}else{
			$(list).prepend(li);
		}
	}

	// Меняем расположение в зависимости от направления выпадания списка
	$(list).css("max-height", listHeight + "px");
	if(listDeploymentToBottom){
		$(list).offset({top: $(cityField).offset().top + $(cityField).height() + 4});
	}else{
		$(list).offset({top: $(cityField).offset().top - $(list).height() - 1.5}); 
	}
	$(list).offset({left: $(cityField).offset().left}); 
}

// Поиск названия города в массиве
function findWords(sub){
	// Если sub пустой
	if(!sub){ 
		switchInputStatus("default");
		switchInputStatus("focus");
		return []; 
	}
	// Если новое val состоит из старого val + 1 символ, то ищем в найденых словах
	sub = shieldingSymbols(sub);
	let lendif = sub.length - oldInputValue.length;
	let mass;
	if((lendif === 0 || lendif === 1) && (sub.search(new RegExp(oldInputValue, "i")) === 0) && oldInputValue){
		mass = findedWords;
	}else{
		mass = massOfWords;
	}

	// Добавляем совпадения в массив найденых слов
	findedWords = [];
	for(let i = 0; mass[i]; i++){
		if(mass[i].City.search(new RegExp(startOfRegExp+sub,"i")) !== -1){
			findedWords.push(mass[i]);
		}
	}

	// Запоминаем значение input.value
	oldInputValue = sub;
	if(findedWords.length !== 0) {
		switchInputStatus("default");
		switchInputStatus("focus");
	}
	countOfListRecord = findedWords.length > 250 ? 20 : 5;
	return findedWords;
}

// Фиксация клика на объект списка
$(document).on("click", ".list-cities-link", function(event){

	if(!event.target.classList.contains("not-found")) {
		cityField.value = $(event.target).text();
		findedId = event.target.getAttribute("city-id");
		$(cityField).removeClass("focus");
		$(chosenRecord).removeClass("chosen");	// Необходимо для выделения текущего 
		$(event.target).addClass("chosen");		// выбора, но конкретно в нашем 
		chosenRecord = event.target;			// случае не имеет смысла
		switchInputStatus("filled");
	}

});

// Для фиксации потери фокуса input
$(document).on("click", function(event){

	if(!event.target.classList.contains("list-cities-link") && event.target !== cityField){
		$(list).addClass("hidden");
		$(cityField).removeClass("focus");
		if(findedWords.length === 1){			// Если найдено одно совпадение, выбираем его
			$(".list-cities-link").click();
		}else{									// Иначе показываем ошибку
			switchInputStatus("error");
		}
	}

})

// Изменение содержимого input
cityField.oninput = function(event) {

	if(cityField.value){
		$(list).removeClass("hidden");
		$(".id-value").removeClass("filled");
	}else{
		$(list).addClass("hidden");
	}

	if(requestError){
		genErrLink();
	}else{
		if(cityField.value.length !== 0){
			linksGen(list, findWords(cityField.value));
		}else{
			switchInputStatus("focus");
			selectedRecord = null;
		}
	}

};

// Перехват отправки формы через Enter
$("#search-form").submit(function(event){
	event.preventDefault();
})

// Обработка клавиатуры в input
$("#city-field").on("keydown", function(event){
	console.log(event.key);
	switch(event.key){
		case "Enter":
			if(!list.classList.contains("hidden") && selectedRecord){ selectedRecord.click(); }
			break;
		case "ArrowDown":
		case "Down":	// Edge
			if(selectedRecord){ $(selectedRecord).parent().next().children().mouseenter() }
			break;
		case "ArrowUp":
		case "Up":		// Edge
			if(selectedRecord){ $(selectedRecord).parent().prev().children().mouseenter() }
			break;
	}
});


// При получении input'ом фокуса
$("#city-field").focus(function(event){
	switchInputStatus("focus");
	if(cityField.classList.contains("filled")){
		$("#city-field").select();
	}else if(cityField.value){
		if(findedWords.length === 0) {
			switchInputStatus("warning");
		}
		$(list).removeClass("hidden");
	}
});

// Выделение записи при наведении мышки
var mouseenterHandle = function(event){
	let target = event.target;
	if(target.classList.contains("not-found")) return;

	if(selectedRecord && target !== selectedRecord)		{ $(selectedRecord).removeClass("selected"); }
	if(selectedRecord	=== chosenRecord)				{ $(chosenRecord).removeClass("chosen"); }
	if(target			!== chosenRecord)				{ $(chosenRecord).addClass("chosen"); }
	$(target).addClass("selected");
	selectedRecord = target;
};

$(document).on("mouseenter",".list-cities-link", mouseenterHandle);
$(document).on("mouseenter",".list-cities-err-request-link", mouseenterHandle); 

// В firefox при масштабировании блок подсказок "шатался"
$(window).resize(function(){
	$(list).offset({left: $(cityField).offset().left}); 
	if(listDeploymentToBottom){
		$(list).offset({top: $(cityField).offset().top + $(cityField).height() + 4});
	}else{
		$(list).offset({top: $(cityField).offset().top - $(list).height() - 1.5}); 
	}
})


	/*
		░░░░░░░░░░░▄▄▄▄░░░░░░░░░░░░░░░░░░░░▄▄▄▄░░░░
		░░░█░░░▄▀█▀▀▄░░▀▀▄░░░▐█░░░░░░░░▄▀█▀▀▄░░▀█▄░
		░░█░░░▀░▐▌░░▐▌░░░░▀░░▐█░░░░░░░▀░▐▌░░▐▌░░░█▀
		░▐▌░░░░░░▀▄▄▀░░░░░░░░▐█▄▄░░░░░░░░▀▄▄▀░░░░▐▌
		░█░░░░░░░░░░░░░░░░░░░░░░▀█░░░░░░░░░░░░░░░░█
		▐█░░░░░░░░░░░░░░░░░░░░░░░█▌░░░░░░░░░░░░░░░█
		▐█░░░░░░░░░░░░░░░░░░░░░░░█▌░░░░░░░░░░░░░░░█
		░█░░░░░░░░░░░░░░░░░░█▄░░▄█░░░░░░░░░░░░░░░░█
		░▐▌░░░░░░░░░░░░░░░░░░▀██▀░░░░░░░░░░░░░░░░▐▌
		░░█░░░░░░░░░░░░░░░▀▄░░░░░░░░▄▀░░░░░░░░░░░█░
		░░░█░░░░░░░░░░░░░░░░▀▄▄▄▄▄▀▀░░░░░░░░░░░░█░░
	*/