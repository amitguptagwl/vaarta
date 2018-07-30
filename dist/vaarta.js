(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Vaarta = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var shuffle = require('./util').shuffle;
var replaceOn = require('./util').replaceOn;
var commonStartingString = require('./util').commonStartingString;

function Shabdawali(targetEl, opts){
    this.element = targetEl;
    if(!opts) opts={};

    this.lines = opts.lines;
    this.playCount = -1;
    this.onChar = opts.onCharChange || function(){};
    this.onLine = opts.onLineChange || function(){};
    this.nextWord = opts.nextWord || function(){};

    this.speed = opts.typingSpeed || 70;
    this.timeToReadAWord = 80;
    this.dynamicPauseBeforeDelete = opts.dynamicPauseBeforeDelete || true; 
    this.pauseBeforeDelete = opts.pauseBeforeDelete || 2000; 
    this.pauseBeforeNext = opts.pauseBeforeNext || 1000; 
    this.delay = opts.delay || 0; //initial delay

    this.typoEffect = opts.typoEffect || false;

    this.deleteSpeed = opts.deleteSpeed || (this.speed / 2);
    this.deleteSpeedArr = [];
    this.deleteUpto = [];

    if(opts.repeat === false){
        this.repeat = false;
    }else{
        this.repeat = true;
    }

    if(opts.deleteEffect === false){
        this.deleteEffect = false;
    }else{
        this.deleteEffect = true;
    }

    if(opts.deleteFrom === "start"){
        this.trimmedText = function(text,len){ return text.substring(1); }
    }else{
        this.trimmedText = function(text,len){ return text.substring(0, len); }
    }
    

    //updateDynamicDeleteSpeed and deleteUpto
    for(var i = 0; i < this.lines.length; i++){
        var line = this.lines[i];
        if(opts.replacable){
            if(i < this.lines.length - 1){
                var commonUpto = commonStartingString(line, this.lines[ i+1 ])
                this.deleteUpto.push(commonUpto || 0);
            }else{
                this.deleteUpto.push(0);//delete upto 1st char
            }
        }else{
            this.deleteUpto.push(0);//delete upto 1st char
        }

        this.deleteSpeedArr.push( opts.deleteSpeed || (this.deleteSpeed  - ( line.length - this.deleteUpto[i] ) ) );
        if( this.deleteSpeedArr[i] < 5 ) this.deleteSpeedArr[i] = 5;
    }
    
    
    this.typo = {//TO DO make it configurable
        max : 1,
        minWordLength : 5,
        goAheadLimit : 3,
        skip : 2,
        randomFactor : 4 //higher 
    }
    
    
    this._pauseCallBack;

    this.events = {
        "pause" : [],
        "resume" : []
    }
}

//Check if the given word should be used for spelling correction effects
Shabdawali.prototype.makeTypo = function(word){//TO DO make it configurable
    return shuffle( word.substr( this.typo.skip ));
}

Shabdawali.prototype.checkIfFitsForTypoEffect = function(word){//TO DO make it configurable
    if (Math.floor((Math.random() * this.typo.randomFactor) + 1) !== 2){
        return false;
    }
    
    if(word.length >= this.typo.minWordLength){
        return true;
    }
}

Shabdawali.prototype.start = function(count){
    this._stopped = false;
    this.currentLineIndex = 0;
    this.currentLetterIndex = 0;
    this.nextWordIndex = 0;
    this.typoCount = 0;
    this.startCorrectingAt = -1;
    if(count && count <= this.lines.length ){
        this.playCount = count;
    }else{
        this.playCount = -1;
    }
    this.element.textContent = '';
    this.typeNext();
}

Shabdawali.prototype.stop = function(){
    this._stopped = true;
}

Shabdawali.prototype.pause = function(){
    this._paused = true;
    this._emit("pause");
}
Shabdawali.prototype.resume = function(count){
    if(count && count <= this.lines.length ){
        this.playCount = count;
    }else{
        this.playCount = -1;
    }
    this._paused = false;
    this._pauseCallBack && setTimeout(this._pauseCallBack, this.pauseUntil);
    this._pauseCallBack = null;

    //repeat when on end
    if(this.currentLineIndex === this.lines.length){
        this.start(count);
    }
    this._emit("resume");
}

Shabdawali.prototype.deleteText = function(cLine){
    if(this._stopped){
        return;
    }else if(this._paused){
        var that = this;
        this._pauseCallBack = function() {
            that.deleteText(cLine);
        }
    }else if(this.correctingText && this.typoRange === 0){
        this.typeText( this.lines[this.currentLineIndex - 1] );
        this.correctingText = false;
    }else if(this.correctingText && this.typoRange > 0){
        this.delete(cLine, this.speed);
        this.typoRange--;
    }else if(this.currentLetterIndex === this.deleteUpto[this.currentLineIndex - 1 ] ){
        this.typeNext();
    }else{
        this.delete(cLine, this.deleteSpeedArr[ this.currentLineIndex -1 ]);
    }
}

Shabdawali.prototype.delete = function(cLine, speed){
    this.onChar("BS");
    this.element.textContent = this.trimmedText(cLine, --this.currentLetterIndex);
    var that = this;
    setTimeout(function() {
        that.deleteText(cLine);
    }, speed);
}


Shabdawali.prototype.typeText = function(cLine){
    if(this._stopped){
        return;
    }else if(this._paused){
        var that = this;
        this._pauseCallBack = function() {
            that.typeText(cLine);
        }
    }else if(cLine){
        if(this.currentLetterIndex === cLine.length){//complete line has been typed
            if(this.typoEffect && this.startCorrectingAt > 0 && this.startCorrectingAt === this.currentLetterIndex){
                this.startCorrectingAt = -1;
                this.correctingText = true;
                this.deleteText(cLine);
            }else if(this.deleteEffect){
                var gape = this.pauseBeforeDelete;
                if(this.dynamicPauseBeforeDelete){
                    gape = this.timeToReadAWord * (cLine.length / 4);
                    if(gape < 2000) gape = 2000;
                }
                var that = this;
                setTimeout(function() {
                    that.deleteText(cLine);
                }, gape );
            }else{
                this.typeNext();
            }
        }else{//still typing
            if( this.typoEffect && this.currentLetterIndex === this.nextWordIndex && this.typoCount < this.typo.max){
                var nextSpaceIndex = cLine.indexOf(' ', this.nextWordIndex);
                //var goAheadLimit = this.typo.goAheadLimit;
                if(nextSpaceIndex === -1) { 
                    nextSpaceIndex = cLine.length + 1;
                    //goAheadLimit = -1;
                }
                var word = cLine.substr(this.nextWordIndex, nextSpaceIndex - this.nextWordIndex);
                this.nextWord(word);//callBack
                if( this.checkIfFitsForTypoEffect(word) ){
                    var typoWord = this.makeTypo( word ) ;
                    cLine = replaceOn(cLine, this.currentLetterIndex + this.typo.skip , typoWord);
                    this.typoCount++;
                    this.typoRange =  word.length;// + goAheadLimit;
                    this.startCorrectingAt = this.currentLetterIndex + this.typoRange ;
                }
                this.nextWordIndex = nextSpaceIndex + 1;
            }

            if(this.typoEffect && this.startCorrectingAt > 0 && this.startCorrectingAt === this.currentLetterIndex){
                this.startCorrectingAt = -1;
                this.correctingText = true;
                this.deleteText(cLine);
            }else{
                var char = cLine.substr( this.currentLetterIndex++ , 1);
                this.onChar( char );
                //this.element.textContent  += char;
                this.element.textContent  = cLine.substr( 0, this.currentLetterIndex  );
                var that = this;
                setTimeout(function() {
                    that.typeText(cLine);
                }, this.speed );
            }

        }
    }
}

Shabdawali.prototype.nextLine = function(){
    if(this.currentLineIndex === this.lines.length){
        if(this.repeat) this.currentLineIndex = 0;
    }
    var line =  this.lines[ this.currentLineIndex ];
    this.onLine("CR", this.currentLineIndex, line);
    this.currentLineIndex++;
    return line;
}

Shabdawali.prototype.typeNext = function(){
    if(this.playCount === 0){
        this.pause();
        var that = this;
        this._pauseCallBack = function() {
            that.typeNext();
        }
        return;
    }else if(this.playCount > 0){
        this.playCount--;
    }else {

    }
    this.nextWordIndex = 0;
    this.typoCount = 0;
    var line = this.nextLine();
    this.currentLetterIndex = this.deleteUpto[ this.currentLineIndex - 2 ] || 0;
    var that = this;
    line && (
        setTimeout(function() {
            that.element.textContent = '';
            that.typeText(line) ;
        }, this.pauseBeforeNext)
    );
}

Shabdawali.prototype._emit = function(eventName){
    for(var i=0; i< this.events[eventName].length; i++){
        this.events[eventName][i]();
    }
}
Shabdawali.prototype.on = function(eventName, fn){
    this.events[eventName].push(fn);
}



module.exports = function(targetEl, opts){
    return new Shabdawali(targetEl, opts);
}

},{"./util":2}],2:[function(require,module,exports){


module.exports.replaceOn = function(line, start, str) {
    return line.substr(0,start) + str + line.substr(start+str.length);
}

module.exports.shuffle = function(word) {
    var a = word.split(""),
        n = a.length;

    for (var i = n - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
        }
    return a.join("");
}

module.exports.commonStartingString = function(line1,line2) {
    for(var i=0; i < line1.length; i++){
        if(line1[i] !== line2[i]) return i;
    }
}
},{}],3:[function(require,module,exports){
var shabdawali = require('shabdawali');

function TalkingNode(actor, count, delay, last ){
    this.actor = actor;
    this.count = count;
    this.delay = delay || 0;
    this.last = last;
    if(last){
        var that = this;
        last.actor.on('pause', function(){
            actor.stop();
            setTimeout( function(){
                actor.start(count);
            }, that.delay);
        })
    }
}

function Vaarta(){
    this.startingNode = {
        actor : {
            events : [],
            on : function(eventName, fn){
                this.events.push(fn);
            }
        }
    }
    this.last = this.startingNode;
    this.actors = {};
}

//register an actor
Vaarta.prototype.add = function(actorName, el, opts){
    opts.repeat = false;
    this.actors[actorName] = {
        target : el,
        options: opts
    }
}

//resiter a speech
Vaarta.prototype.speak = function(actorName, dialauges, delay){
    return this._addTalkingNode(actorName, dialauges, delay, true);
}

//register a parallel speech 
Vaarta.prototype.and = function(actorName, dialauges, delay){
    return this._addTalkingNode(actorName, dialauges, delay);
}

Vaarta.prototype._addTalkingNode = function(actorName, dialauges, delay, appendToLast){
    if(typeof dialauges === 'string'){
        dialauges = [ dialauges ];
    }else if(!Array.isArray(dialauges) ){
        throw Error("invalid parameters");
    }
    var opts = Object.assign({},{ lines : dialauges }, this.actors[actorName].options );
    var actor = shabdawali( this.actors[actorName].target, opts );

    var talkingNode = new TalkingNode( actor, dialauges.length, delay , this.last );
    if(appendToLast === true)
        this.last = talkingNode ;

    return this;
}

Vaarta.prototype.start = function (){
    for(var i=0; i< this.startingNode.actor.events.length; i++){
        this.startingNode.actor.events[i]();
    }
}


module.exports = Vaarta;
},{"shabdawali":1}]},{},[3])(3)
});
