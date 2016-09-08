var stroller = "\uEB42";
var baby = "\uEB41";
var men = ["\uE536", "\uE566"];
var swap = "\uE8D6";
var dead =  "\uE84E"; // man standing  // "\uE814";
var vehicles = ["\uE52F", "\uE558"];

var speeds = [0, 2, 1.8, 4];

//var skintones = ["#8d5524","#c68642","#e0ac69","#f1c27d","#ffdbac"];
//var skintones = ["141,85,36","198,134,66","224,172,105","241,194,125","255,219,172"];
//var safe_colors = ["#FFFFFF", "#FFB6DB", "#B6DBFF", "#FFFF6D;"];

var safe_colors = ["255,255,255", "255,182,219", "182,219,255", "255,255,109"];
var scores = ["\uE400","\uE401","\uE3FB","\uE3FD","\uE3FE","\uE3FF"];

var difficulty = 0;
var score = 0;
var highscore;

var score_counter = 0;
var leg_counter = 0;
var lastTime;
var hasBaby = false;
var hasStroller = false;
var vehicleCount = 0;

var intro;
var howtoplay;
var canvas;
var context;
var playing = false;

var radius = []; // the size of the two circle tracks

var items;
var deviceWidth = 360;
var deviceHeight = 360;
var centerX;
var centerY;

/*
  speed, direction, duration
    - for vehicle
      - duration random seconds between 5 and 12
    - for baby/stroller
      if difficulty > 2
        - duration between 10 - 16
      else
        - duration = 16
    - start frames = duration * 16.667 (frame draws per second)
    - curr frame = decrease each time
    - alpha = (currframe / startframes * 0.9) + .1  // minimum alpha of .1
    - if curr frame <= 0
      - remove item from items array
      - add another of same type
    - +2 for getting a baby, +5 for delivering
    - # vehicles = difficulty level
    - difficulty 0 until first baby disappears
      - through time or delivery
    - difficulty 1
      - one vehicle
    - difficulty 2
      - score 30
    - difficulty 3
      - score 50
    - difficulty 4
      - score 75
    - difficulty 5
      - score 100
    - difficulty 6
      - score >= 120
*/


window.onload = function() {

    document.addEventListener('tizenhwkey', function(e) {
        if(e.keyName === "back") {
            try {
                tizen.power.release("SCREEN");
                tizen.application.getCurrentApplication().exit();
            } catch (ignore) {
            }
        }
    });

    tizen.power.request("SCREEN", "SCREEN_NORMAL");

    if (localStorage.getItem("highscore") === null) {
        // first time playing
        localStorage.setItem("highscore", 0);
        highscore = 0;
    } else {
        highscore = localStorage.getItem("highscore");
    }

    try {
        tizen.systeminfo.getPropertyValue("DISPLAY", function(disp) {
            deviceWidth = disp.resolutionWidth;
            deviceHeight = disp.resolutionHeight;
        });
    } catch (e) {
        deviceWidth = 360;
        deviceHeight = 360;
    } finally {
        intro = document.getElementById('intro');
        canvas = document.getElementById('canvas');
        howtoplay = document.getElementById('howtoplay');

        context = canvas.getContext('2d');
        centerX = deviceWidth / 2;
        centerY = deviceHeight / 2;
        radius[0] = deviceWidth / 2 - 40;
        radius[1] = deviceWidth /2 - 100;
        showIntro();
    }


    document.addEventListener("rotarydetent", function(ev) {
       // Get the direction value from the event
       var direction = ev.detail.direction;

       if (direction == "CW") {
          // Add behavior for clockwise rotation
          if (items[0].direction == -1) {
            items[0].direction = 1;
            newspeed = 1;
          }
       } else if (direction == "CCW") {
          // Add behavior for counter-clockwise rotation
          if (items[0].direction == 1) {
            items[0].direction = -1;
            newspeed = 1;
          }
       }
    });

    document.onkeydown = function(event) {

      if (event.keyCode == 32) {
        switchTracks();
        return;

      }
/*
      var newspeed = items[0].speed + 1;

      if (newspeed > 4) {
        newspeed = 1;
      }
*/
      if (event.keyCode == 37) {
          // left arrow
          if (items[0].direction == -1) {
            items[0].direction = 1;
            newspeed = 1;
          }
      } else if (event.keyCode == 39) {
          // right arrow
        if (items[0].direction == 1) {
          items[0].direction = -1;
          newspeed = 1;
        }
      }

      items[0].speed = newspeed;
    };
};

function animate(currTime) {

    if (!currTime) {
      currTime = window.performance.now();
    }

    if (!lastTime) {
      lastTime = currTime;
    }

    var diff = currTime - lastTime;
    score_counter += diff;
    lastTime = currTime;

//    console.log("score counter", score_counter, currTime, lastTime);
    if (score_counter > 1000) {
      score++;
      updateScore();
      score_counter = 0;
    }

    leg_counter += diff;
    if (leg_counter > 250) {
      if (items[0].char == men[0]) {
        items[0].char = men[1];
      } else {
        items[0].char = men[0];
      }

      leg_counter = 0;
    }

    if (hasBaby == false && hasStroller == false) {
      addBabyAndStroller();
    }

    clearCanvasRegion(0, 0, canvas.width, canvas.height);

    // first draw the background circles

    for (var i = 0; i < radius.length; i++) {
      context.beginPath();
      context.strokeStyle = "rgba(200,200,200,0.3)";
      context.lineWidth = 2;
      context.arc(centerX, centerY, radius[i], 0, Math.PI * 2, false);
      context.closePath();
      context.stroke();
    }

    context.fillStyle = "#00FF00";
    context.font = "14px 'VideoGame'";
    var score_text = "SCORE " + score;
    context.fillText(score_text, deviceWidth / 2 - (score_text.length * 14) / 2, deviceHeight - 20);

    items.forEach(function(item, idx) {

        if (idx > 0) {

            if (leg_counter == 0) {
              item.duration -= .25;
              item.alpha = item.duration / item.start_duration * 0.9 + .1;

              if (item.alpha <= .1) {
                // remove this item.
                console.log("removing", item);

                switch (item.type) {
                  case "B":
                    hasBaby = false;
                    break;
                  case "S":
                    hasStroller = false;
                    break;
                  case "V":
                    addVehicle();
                    break;
                }

                items.splice(idx, 1);
              }
            }

            // check all non-stroller items for collision
            var a = items[0].x - item.x;
            var b = items[0].y - item.y;
            var distance = Math.sqrt(a * a + b * b);

            if (distance < 24) {
                // collision
                switch (item.type) {

                  case "B":
                    if (items[0].babycount == 0) {
                      items[0].babycount = 1;
                      item.type = "SCORE";
                      item.char = scores[2];
                      item.speed = 0;
                      item.color = "0,255,0";
                      item.alpha = 1;
                      item.duration = 2;
                      item.start_duration = 2;
                      score += 2;
                      updateScore();
                      hasBaby = false;
                    }
                    break;

                  case "S":
                    if (items[0].babycount == 1) {
                      items[0].babycount = 2;
                      item.type = "SCORE";
                      item.char = scores[4];
                      item.speed = 0;
                      item.color = "0,255,0";
                      item.alpha = 1;
                      item.duration = 2;
                      item.start_duration = 2;
                      score += 5;
                      updateScore();
                      hasStroller = false;
                    }
                    break;

                  case "V":
                    items[0].char = dead;
                    item.color = "255,0,0";
                    break;
                }
            }
        }

        drawItem(item);
    });

    if (playing == true) {
        // now draw the "swap tracks" button
        context.save();
        context.fillStyle = "#00FFFF";
        context.font = "72px 'Material Icons'";
        context.fillText(swap, centerX - 36, centerY + 36);
        context.restore();

        window.requestAnimationFrame(animate);

        if(items[0].char == dead) {
            // we need one more loop
            playing = false;
        }

    } else {
        context.fillStyle = "#00FFFF";
        context.font = "24px 'VideoGame'";
        context.fillText("GAME OVER", deviceWidth / 2 - (9 * 24) / 2, centerY);

        context.fillStyle = "#00FFFF";
        context.font = "20px 'VideoGame'";
        context.fillText("~ TAP HERE ~", deviceWidth / 2 - (12 * 20) / 2, centerY + 40);
        canvas.removeEventListener('click', switchTracks);
        canvas.addEventListener('click', showIntro, false);
    }

}

function startClicked() {
    var holder = document.getElementById('holder');
    holder.removeEventListener("click", startClicked);

    intro.innerHTML = "";
    setElementSize(intro, 0, 0);
    setElementPos(intro, 0, 0);

    canvas.width = deviceWidth;
    canvas.height = deviceHeight;
    navigator.vibrate(1000);

    setElementPos(canvas, 0, 0);

 // character man always first for easy access
    items = [{
                    type: 'MAN',
                    char: men[0],
                    color: safe_colors[0],
                    size: 48,
                    alpha: 1,
                    speed: 1,
                    direction: 1,
                    angle: 0,
                    circle: 0,
                    babycount: 0,
                    x: 0,
                    y: 0
                }];

    canvas.addEventListener('click', switchTracks, false);

    score = 0;
    score_counter = 0;
    vehicleCount = 0;
    difficulty = 0;
    playing = true;
    addBabyAndStroller();
    animate();
}

function drawItem(item) {

    item.angle += item.direction * (Math.acos(1 - Math.pow(speeds[item.speed] / radius[item.circle], 2) /2));

    var degrees = (item.angle * 57.2957) % 360;
    var flip = false;

    if (item.type != "SCORE") {
      if (item.direction == 1) {
        if ((degrees > 0 && degrees < 180) || (degrees < -180)) {
          flip = true;
        }
      } else {
        if ((degrees > 180) || (degrees < 0 && degrees > -180)) {
          flip = true;
        }
      }
    }

    item.x = centerX + radius[item.circle] * Math.cos(item.angle);
    item.y = centerY + radius[item.circle] * Math.sin(item.angle);

    context.save();
    context.textBaseline = "middle";
    context.textAlign = "center";

    if (flip == true) {
        context.translate(item.x, item.y);
        context.scale(-1, 1);
        context.fillStyle = "rgba(" + item.color + "," + item.alpha + ")";
        context.font = item.size + "px 'Material Icons'";
        context.fillText(item.char, 0, 0);
    } else {
        context.save();
        context.fillStyle = "rgba(" + item.color + "," + item.alpha + ")";
        context.font = item.size + "px 'Material Icons'";
        context.fillText(item.char, item.x, item.y);
        context.restore();
    }

    context.restore();

}

function addVehicle() {

    var duration = getRandomInRange(5, 12);

    placeItem("V", vehicles[Math.floor(Math.random() * vehicles.length)],
                true, getColor(), duration);
}

function addBabyAndStroller() {
    var color;
    var okay = false;
    var duration;

    if (difficulty > 2) {
        duration = getRandomInRange(10, 16);
    } else {
        duration = 16;
    }

    // we don't want multiple babies and strollers with the same color visible at the same time
    while (okay != true) {
        color = getColor();
        okay = true;
        items.forEach(function(item, idx) {
            if (item.type == "B" && item.color == color) {
                okay = false;
            }
        });
    }

    placeItem("B", baby, false, color, duration);
    placeItem("S", stroller, true, color, duration);
    items[0].babycount = 0;
    hasBaby = true;
    hasStroller = true;
}


function placeItem(type, char, canmove, color, duration) {

    var goodfound = false;
    var circle;
    var new_angle;
    var threshold = 45; // number of degrees space between things
    var degrees_per_radian = 57.295779513;

    if (items.length >= 10) {
        // let's not clog the screen
        return;
    }

    while (goodfound === false) {
        circle = Math.floor(Math.random() * radius.length);
        new_angle = Math.random() * 360;
        goodfound = true;

        items.forEach(function(item, idx) {

            if (item.circle == circle) {
                // only need to check guys on the same circle
                var item_angle = item.angle * degrees_per_radian;

                // calculate the distance and see if it's past our threshold: http://stackoverflow.com/a/9505991/2140962
                var raw_diff = Math.floor((item_angle > new_angle) ? item_angle - new_angle : new_angle - item_angle);
                var mod_diff = raw_diff % 360;
                var dist = (mod_diff > 180.0) ? 360.0 - mod_diff : mod_diff;

                if (dist < threshold) {
                    goodfound = false;
                }
            }
        });
    }

    var direction = -1;

    if (getRandomInRange(0, 1) == 1) {
      direction = 1;
    }

    items.push({type: type,
                char: char,
                color: color,
                size: 48,
                alpha: 1,
                speed: 2,
                direction: direction,
                angle: new_angle / degrees_per_radian,
                start_duration: duration,
                duration: duration,
                circle: circle,
                x: 0,
                y: 0
            });
}

function updateScore() {

  if (score > 100 && vehicleCount < 3) {
    difficulty = 3;
    addVehicle();
    vehicleCount++;
  } else if (score > 50 && vehicleCount < 2) {
    difficulty = 2;
    addVehicle();
    vehicleCount++;
  } else if (score > 10 && vehicleCount == 0) {
    difficulty = 1;
    vehicleCount = 1;
    addVehicle();
  }

  if (score > highscore) {
    localStorage.setItem("highscore", score);
    highscore = score;
  }
}

function showIntro() {

    howtoplay.removeEventListener("click", showIntro);
    setElementSize(howtoplay, 0, 0);
    setElementPos(howtoplay, 0, 0);
    howtoplay.innerHTML = "";

    canvas.removeEventListener('click', showIntro);
    canvas.width = 0;
    canvas.height = 0;

    var babytext = '<i class="material-icons" style="color: rgb(~c~)">&#xEB41;</i> ';


    var html = "<div id='holder'><div class='title'>Save the Babies</div><div>"
             + babytext.replace("~c~", safe_colors[1])
             + babytext.replace("~c~", safe_colors[2])
             + babytext.replace("~c~", safe_colors[3])
             + babytext.replace("~c~", safe_colors[0])
             + "</div><div style='margin: 15px 0px;' class='start'><u>START</u></div></div>"
             + "<div id='high-score'>HI-SCORE " + highscore + "</div>"
             + "<div style='margin: 15px 0px; font-size: 13px' id='play'><u>how to play</u>"
             + "<div style='font-size: 8px; margin-top: 25px;'>&copy; Copyright 2016</div></div>";

    clearCanvasRegion(0, 0, canvas.width, canvas.height);

    intro.innerHTML = html;
    intro.style.opacity = 1;
    setElementSize(intro, deviceWidth, deviceHeight * 0.8);
    setElementPos(intro, deviceHeight * 0.20, 0);

    var holder = document.getElementById('holder');
    holder.addEventListener("click", startClicked, false);

    var play = document.getElementById('play');
    play.addEventListener("click", howToPlay, false);
}

function howToPlay() {
    var holder = document.getElementById('holder');
    holder.removeEventListener("click", startClicked);

    intro.innerHTML = "";
    setElementSize(intro, 0, 0);
    setElementPos(intro, 0, 0);

    setElementSize(howtoplay, deviceWidth * .75, deviceHeight * 2);
    setElementPos(howtoplay, deviceHeight * 0.2, 0);

    var html = "<div style='width: 100%; text-align: center; font-weight: bold; color: #FFFF00;'>The babies have escaped from the daycare!<br />Help collect the babies.</div>"
            + "<ol><li>Pick up a baby<br /><i class='material-icons' style='font-size: 48px; text-baseline: middle'>&#xEB41;</i></li>"
            + "<li style='margin-top: 15px'>Bring the baby to a stroller<br /><i class='material-icons' style='font-size: 48px; text-baseline: middle'>&#xEB42;</i></li>"
            + "<li style='margin-top: 15px'>Avoid bikes and trucks<br /><i class='material-icons' style='font-size: 48px; text-baseline: middle'>&#xE52F;</i> <i class='material-icons' style='font-size: 48px; text-baseline: middle'>&#xE558;</i></li>"
            + "<li style='margin-top: 15px'>Use the bezel to reverse direction<br /><i class='material-icons' style='font-size: 48px; text-baseline: middle'>&#xE419;</i> <i class='material-icons' style='font-size: 48px; text-baseline: middle'>&#xE41A;</i></li>"
            + "<li style='margin-top: 15px'>Tap anywhere to switch tracks<br /><i class='material-icons' style='font-size: 48px; text-baseline: middle'>&#xE8D6;</i> </li></ol>"
            + "<div style='margin: 15px auto; font-size: 32px; font-weight: bold; width: 100%; text-align: center' class='start'><u>GOT IT</u></div>";

    howtoplay.innerHTML = html;
    howtoplay.addEventListener("click", showIntro, false);

}

function switchTracks() {
    items[0].circle = (items[0].circle == 1) ? 0 : 1;
}

function getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max -min + 1) + min);
}

function getColor() {
    return safe_colors[Math.floor(Math.random() * safe_colors.length)];
}

function clearCanvasRegion(top, left, w, h) {
    context.clearRect(top, left, w, h);
}

function setElementSize(ele, w, h) {
    ele.style.width = Math.floor(w) + "px";
    ele.style.height = Math.floor(h) + "px";
}

function setElementPos(ele, top, left) {
    ele.style.top = Math.floor(top) + "px";
    ele.style.left = Math.floor(left) + "px";
}
