const d3 = require('d3');
const Chart = require('chart.js');

require('./chart-extensions.js');

var OUTLINE_COLOR = "#b1b1b1";
var BACKGROUND_COLOR = "#fbfff3";

var LEGEND_COLOR = "#2F394D";
var LEGEND_FONT = "Ropa Sans";

Chart.defaults.global.defaultFontColor = "#80857b";

function tooltipLabel(tooltipItem, data, signed) {
    var val = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
    var formattedVal = Math.round(10000 * val) / 100;
    if (signed) {
        formattedVal = (formattedVal < 0 ? "-" : "+") + Math.abs(formattedVal);
    }
    return data.labels[tooltipItem.index] + ": " + formattedVal + "%";
}

(function() {
    var w = $(window).width() * 0.55;
    var h = $(window).height() * 0.5;
    var chartH = h / 2;

    var pieCharts;
    var diffChart;

    $(document).ready(function() {
        d3.queue()
            .defer(d3.json, "data/victims_armed.json")
            .defer(d3.json, "data/us-census.json")
            .await(ready);

        var ethnicitySectionContainer = d3.select("#ethnicitySectionContainer");
        var canvasContainer = d3.select("#ethnicityCanvasContainer");

        canvasContainer.append("canvas")
            .attr("width", w)
            .attr("height", h)
            .attr("id", "pieCharts");
        canvasContainer.append("canvas")
            .attr("width", w)
            .attr("height", chartH)
            .attr("id", "diffChart")
            .style("display", "none")
            // add some padding between charts
            .style("margin-top", (($(window).height() - h - chartH) / 4) + "px");


    });

    function ready(error, victimData, censusData) {
        if (error) throw error;
        censusData = censusData.sort(compareStrings);
        var selected = prepareForm(victimData, censusData);

        var allVictimData = victimData[selected].values.sort(compareStrings);

        // --outline-color, --red-dark, --secondary-color, --dark-gray, --red, --red-faded, --red-faded, --gray
        // african american, asian, hispanic
        var colors = ["#2f394d", "#dcdfd7", "#a03e33", "#80857b", "#2e1513", "#d08e84", "#819fb1"];

        pieCharts = makePieCharts(allVictimData, colors);

        // set this up now but it will remain hidden
        diffChart = makeDiffChart(allVictimData, censusData, colors);
        $("#pieProceed").click(function() {
            animatePieChart(pieCharts, censusData);
            setTimeout(function() { $(".reveal1").fadeIn("slow"); }, 750);
            $("#pieProceed").fadeOut("fast");
        });

        $("#armedProceed").click(function() {
            setTimeout(function() { $(".reveal2").fadeIn("slow"); }, 750);
            $("#armedProceed").fadeOut("fast");
        });

        // attach events to rotate when click on race name in text
        var rotateByLabel = function(label) {
            var index = allVictimData.findIndex(function(d) {
                return d.key === label;
            });
            // this is the callback to call when clicked
            return function() { rotateChart(index) };
        }
        $("#ethnicitySectionText .white").click(rotateByLabel("White"));
        $("#ethnicitySectionText .african-american").click(rotateByLabel("African American"));
        $("#ethnicitySectionText .hispanic").click(rotateByLabel("Hispanic"));

        // setting up the width of the rightmost instructions
        var containerWidth = parseFloat(d3.select("#ethnicitySectionContainer").style("width"));
        var chartWidth = parseFloat(d3.select("#ethnicityCanvasContainer").style("width"));
        var instructionWidth = containerWidth - chartWidth
            - parseFloat(d3.select("#pieInstructions").style("padding-left"));

        d3.select("#ethnicitySectionContainer .sectionTitle").style("width", chartWidth + "px");
        d3.select("#pieInstructions").style("width", instructionWidth + "px");
    }

    function prepareForm(victimData, censusData) {
        var toSelect = 0;
        var form = $("#selectArmed");
        for (var i = 0; i < victimData.length; i++) {
            var armedType = victimData[i].armed;

            var checked = "";
            if (i === toSelect) {
                checked = "checked='checked'";
            }
            var radio = $("<input type='radio' name='armed' id='" + armedType
                + "' value='" + i + "' " + checked + ">");
            var label = $("<label for='" + armedType + "' value='" + i + "'>" + armedType + "</label>");
            form.append(radio);
            form.append(label);
        }
        $("#selectArmed input:radio").click(function() {
            var index = parseInt($(this).val());
            selectArmedType(index, victimData, censusData);
        });
        return toSelect;
    }

    function selectArmedType(index, victimData, censusData) {
        var selectedData = victimData[index].values.sort(compareStrings);
        var diffs = selectedData
            .map(function(d, i) { return d.value - censusData[i].value; })
            .filter(function(d, i) { return selectedData[i].key !== "Unknown"; })

        // the last one is the victim data
        var datasets = pieCharts.config.data.datasets;
        datasets[datasets.length - 1].data =
                selectedData.map(function(d) { return d.value; });

        // reset rotation levels
        var oldIndex = pieCharts.config.options.rotationIndex;
        pieCharts.reset();
        rotateChart(oldIndex); // updates chart as well

        diffChart.config.data.datasets[0].data = diffs;
        diffChart.update(750);
    }

    function makePieCharts(victimData, colors) {
        var rotation = function(event, clicked) {
            // this will be an array of one element if clicked on a arc and an object if clicked on a label
            if (clicked.length > 0 || (typeof(clicked) === "object") && !Array.isArray(clicked)) {
                var index = Array.isArray(clicked) ? clicked[0]._index : clicked.index;
                rotateChart(index);
            }
        }

        return new Chart($("#pieCharts"), {
            type: "nestedDoughnut",
            data: {
                labels: victimData.map(function(d) { return d.key; }),
                datasets: [{
                    label: 'Percent of Victims',
                    data: victimData.map(function(d) { return d.value;}),
                    backgroundColor: colors,
                    borderColor: BACKGROUND_COLOR,
                    hoverBorderColor: BACKGROUND_COLOR,
                    borderWidth: 2
                }]
            },
            options: {
                rotationIndex: 0,
                elements: {
				    center: {
					    text: "Race of Victims",
                        color: LEGEND_COLOR, // Default is #000000
                        fontStyle: LEGEND_FONT, // Default is Arial
                        sidePadding: 20 // Defualt is 20 (as a percentage)
				    }
                },
                hover: {
                    onHover: changePointer("#pieCharts")
                },
                tooltips: {
                    callbacks: {
                        label: tooltipLabel
                    }
                },
                legend: {
                    onClick: rotation,
                    onHover: changePointer("#pieCharts"),
                    position: "left",
                    labels: {
                        fontColor: LEGEND_COLOR,
                        fontFamily: LEGEND_FONT
                    }
                },
                onClick: rotation
			}
        });
    }

    function animatePieChart(chart, censusData) {
        var config = chart.config;
        config.data.datasets.unshift({
            label: 'Percentage of Population',
            data: censusData.map(function(d) { return d.value;}),
            backgroundColor: config.data.datasets[0].backgroundColor, // use the same color
            borderColor: BACKGROUND_COLOR,
            hoverBorderColor: BACKGROUND_COLOR,
            borderWidth: 2
        });
        config.options.elements.right = {
            text: "Race of Population",
        }
        setTimeout(function() { $("#diffChart").fadeIn("slow"); }, 750);
        chart.update(750, true);
    }

    function rotateChart(index) {
        var datasets = pieCharts.config.data.datasets;
        var rotationIndex = pieCharts.config.options.rotationIndex;
        for (var i = 0; i < datasets.length; i++) {
            var data = datasets[i].data;
            var sum = 0;
            if (index < rotationIndex) {
                for (var j = index; j < rotationIndex; j++) {
                    sum += data[j];
                }
                pieCharts.config.options.rotations[i] += sum * 2 * Math.PI;
            } else {
                for (var j = rotationIndex; j < index; j++) {
                    sum += data[j];
                }
                pieCharts.config.options.rotations[i] -= sum * 2 * Math.PI;
            }
        }
        pieCharts.config.options.rotationIndex = index;
        pieCharts.update();
    }

    function changePointer(id) {
        return function(event, hovered) {
            $(id).css("cursor", hovered[0] ? "pointer" : "default");
        }
    }

    function makeDiffChart(victimData, censusData, colors) {
        // we don't want the "Unknown" race to show up in the diff chart
        // because it doesn't show up in the census, remove it from the stuff
        var unknownIndex = 0;
        var diffs = victimData.map(function(d, i) {
            if (d.key === "Unknown") {
                unknownIndex = i;
            }
            return { "key": d.key, "value": d.value - censusData[i].value};
        }).filter(function(_, i) { return i !== unknownIndex; });

        var chartColors = colors.slice()
            .filter(function(_, i) { return i !== unknownIndex; });

        return new Chart($("#diffChart"), {
            type: 'bar',
            data: {
                labels: diffs.map(function(d) { return d.key; }),
                datasets: [{
                    label: 'Difference Between Victim and Population Percentages',
                    data: diffs.map(function(d) { return d.value; }),
                    backgroundColor: chartColors,
                    borderColor: chartColors,
                    borderWidth: 1
                }]
            },
            options: {
                legend: {
                    labels: {
                        boxWidth: 0, // make the annoying legend box dissapear
                        fontSize: 20,
                        fontColor: LEGEND_COLOR,
                        fontFamily: LEGEND_FONT
                    },
                    //position: "bottom",
                    onClick: null
                },
                hover: {
                    onHover: changePointer("#diffChart")
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            // not great, but hardcoding min/max values rounded to nearest 5
                            min: -0.15,
                            max: 0.20,
                            beginAtZero: true,
                            fixedStepSize: 0.05,
                            fontFamily: LEGEND_FONT,
                            fontColor: LEGEND_COLOR,
                            callback: function(val) {
                                val = val.toFixed(2);
                                return parseInt(100 * val) + "%"; // floating point is hard
                            }
                        }
                    }],
                    xAxes: [{
                        ticks: {
                            fontFamily: LEGEND_FONT,
                            fontColor: LEGEND_COLOR
                        }
                    }]
                },
                tooltips: {
                    callbacks: {
                        label: function(tooltipItem, data) { return tooltipLabel(tooltipItem, data, true); }
                    }
                },
                onClick: function(event, clicked) {
                    if (clicked.length > 0) {
                        var index = clicked[0]._index;
                        if (index >= unknownIndex) {
                            index++;
                        }
                        rotateChart(index);
                    }
                }
            }
        })
    }

    function compareStrings(s1, s2) {
        if (s1.key < s2.key) {
            return -1;
        } else if (s2.key === s1.key) {
            return 0;
        } else {
            return 1;
        }
    }
}());
