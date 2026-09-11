import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, QueryList, signal, ViewChild, ViewChildren } from '@angular/core';
import { CanvasJSAngularChartsModule } from '@canvasjs/angular-charts';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import ChartDataLabels from "chartjs-plugin-datalabels";
import { MatExpansionModule } from '@angular/material/expansion';
import { NgxPrintModule, NgxPrintService, PrintOptions } from 'ngx-print';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { debounceTime, forkJoin, lastValueFrom, of, switchMap } from 'rxjs';
import { ExtractTextPipe } from '../../../extract-text.pipe';
import { InnerDropdownComponent } from '../../applicant/list-applicant/inner-dropdown/inner-dropdown.component';
import { LoaderService } from '../../../services/utility/loader.service';
import { ApiService } from '../../../services/api.service';
import { StorageService } from '../../../services/utility/storage.service';
import { AlertService } from '../../../services/alert.service';
import { UtilityService } from '../../../services/utility/utility.service';
import { FormsModule } from '@angular/forms';
Chart.register(...registerables, ChartDataLabels); // Register required plugins


Chart.register(...registerables);

@Component({
  selector: 'app-makr-generator',
  standalone: true,
  imports: [CommonModule, ExtractTextPipe, CanvasJSAngularChartsModule, MatButtonModule, MatMenuModule,
    MatSort, MatSortModule, MatFormFieldModule, MatInputModule, MatTableModule, MatPaginator, MatExpansionModule,
    InnerDropdownComponent,FormsModule,
    MatPaginatorModule, RouterLink, NgxPrintModule],
  templateUrl: './makr-generator.component.html',
  styleUrl: './makr-generator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MakrGeneratorComponent implements AfterViewInit, OnInit {
  @ViewChild('mychart') mychart: any;
  panelOpenState = false;
  public charts: Chart;
  questions: any[] = [];

  totalPercentageOfAllCategory: any = 0;
  totalObtainedMarkOfAllCategory: number = 0;
  categoryList: { [key: string]: any[] } = {
    'General': [],
    'Decarbonization': [],
    'Circularity': [],
    'Health & Safety': [],
    'Human Rights': []
    // 'Automobile Sector': []
  };
  chart: any;

  displayedColumns: string[] = ['position', 'name', 'weight', 'maxMark', 'applicantObtendMark','assessorObtendMark','changedMark','scoring'];
  dataSource = new MatTableDataSource<any>([]);
  dataSource1 = new MatTableDataSource<any>([]);
  dataSource2 = new MatTableDataSource<any>([]);
  dataSource3 = new MatTableDataSource<any>([]);
  dataSource4 = new MatTableDataSource<any>([]);
  financialYear: string = new Date().getFullYear().toString();

  applicantId: string = '';
  userMeta: any = {};
  isFromAdmin: string = '';

  constructor(private loaderService: LoaderService,
    private apiService: ApiService,
    private printService: NgxPrintService,
    private actRoute: ActivatedRoute,
    private storageService: StorageService,
    public locationApi: Location,
    private alertService: AlertService,
    private utilityService: UtilityService,
    private cd: ChangeDetectorRef,
  
  ) {
    this.actRoute.queryParams
      .subscribe(params => {
        this.applicantId = params['applicantId'];
        this.isFromAdmin = params['from'] || '';
        if (this.applicantId) {
          setTimeout(() => {
            this.getQuestionnaireSeries();
          }, 1000);

        }
      }
      );
  }
  mycharts: any;

  ngAfterViewInit() {
    this.canvas = this.mychart.nativeElement;
    this.ctx = this.canvas.getContext('2d');

    this.mycharts = new Chart(this.ctx, this.options);
    // console.log(this.mycharts);
    // sudo forever restartall
    // this.charts = new Chart("canvas", {

    this.charts = new Chart("canvas", {
      type: "bar",
      data: {
        labels: ["General", "Decarbonization", "Circularity", "Health & Safety", "Human Rights"],
        datasets: [
          {
            label: "Total",
            data: [0, 0, 0, 0, 0],
            // backgroundColor: "rgba(220, 220, 220, 0.3)",
            backgroundColor: "rgba(220, 220, 220, 0.2)",

            borderWidth: 0,
            stack: "Stack 0",
            borderRadius: { topLeft: 10, topRight: 10 },
            borderSkipped: "bottom"
          },
          {
            label: "Actual",
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
              "rgb(248, 99, 0)", // Darker General
              "rgb(96, 158, 21)", // Darker Decarbonization
              "rgb(133, 204, 0)", // Darker Circularity
              "rgb(205, 255, 26)", // Darker Health & Safety
              "rgb(255, 238, 0)"  // Darker Human Rights
            ],
            borderWidth: 0,
            stack: "Stack 0",
            borderRadius: { topLeft: 10, topRight: 10 },
            borderSkipped: "bottom"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animations: {
          y: {
            duration: 1000,
            easing: "linear"
          }
        },
        plugins: {
          legend: {
            display: false
          },
          datalabels: {
            textAlign: 'center',
            anchor: "end",
            align: "end",
            offset: 5,
            color: "#000",
            font: {
              size: 16,
              weight: 600
            },
            padding: {
              bottom: 6
            },
            formatter: (value) => Number(value).toFixed(2)
          }
        },
        scales: {
          x: {
            stacked: false,
            grid: {
              display: false
            },
            ticks: {
              padding: 15,
              align: 'center', //
              // align: 'end',
              font: {
                size: 16,
                weight: 600
              }
            }
          },
          y: {
            stacked: false,
            beginAtZero: false,
            ticks: {
              stepSize: 5
            }
          }
        }
      }
    });




  }

  ngOnInit(): void {
    this.storageService.getStorage('financialYear').subscribe({
      next: (year: any) => {
        // console.log(year);
        if (year) {
          this.financialYear = year;
        }
      }
    })
    this.storageService.getStorage('EcoUser').subscribe({
      next: (user: any) => {
        if (user !== null) {
          this.userMeta = user;
        }
      }
    });



  }


  // new chart half
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;

  chartData = [
    { value: 0, color: '#F88900', name: 'General' },
    { value: 0, color: '#6BB017', name: 'Decarbonization' },
    { value: 0, color: '#9CEF00', name: 'Circularity' },
    { value: 0, color: '#D2FF31', name: 'Health & Safety' },
    { value: 0, color: '#FFEF15', name: 'Human Rights' },
  ];

  // Calculate the total value
  totalValue = this.chartData.reduce((acc, el) => acc + el.value, 0);

  // Calculate percentage of the first value (modify if needed)
  percentage = Math.round((this.chartData[0].value / this.totalValue) * 100);

  data = {
    labels: this.chartData.map((el) => el.name),
    datasets: [
      {
        data: this.chartData.map((el) => el.value),
        backgroundColor: this.chartData.map((el) => el.color),
        cutout: '70%',
        circumference: 180,
        rotation: 270,

      },
    ],
  };


  printMe() {
    const customPrintOptions: PrintOptions = new PrintOptions({
      printSectionId: 'print-section',
      // Add any other print options as needed

    });
    // console.log("ok");
    this.printService.print(customPrintOptions)
  }

  options: ChartConfiguration = {
    type: 'doughnut',
    data: this.data,
    options: {
      responsive: true,
      maintainAspectRatio: true, // Allows custom width & height
      animations: {
        y: {
          duration: 1000,
          easing: "linear"
        }
      },

      elements: {
        arc: {
          borderWidth: 0,
          borderColor: '#ffffff',
          borderRadius: 0,
        },
      },
      plugins: {
        tooltip: {
          enabled: true,
          position: 'nearest',
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxHeight: 18,
            boxWidth: 18,
            usePointStyle: true,
            pointStyle: 'circle',

            font: {
              size: 16, // Keep legend size unchanged
              weight: 600
            },
            padding: 12,
          },

        },
        title: {
          display: false,
        },
        datalabels: {
          display: true, // Hide data labels inside the chart
          color: 'black'

        },
      },
      layout: {
        padding: {
          bottom: 30, // Adjust this value to create space below the legend
        },
      },
    },
    plugins: [
      {
        id: 'centerText',
        beforeDraw: (chart) => {
          const { width, height, ctx } = chart;
          ctx.save();
          ctx.font = 'bold 28px Arial';
          ctx.fillStyle = '#333'; // Text color
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const centerX = width / 2;
          const centerY = height / 2 + 30; // Move text up by 10px

          // Dynamic percentage text
          let text = `${this.totalPercentageOfAllCategory}`;
          if (this.financialYear == '2024') {
            // as per the client requirement 
            if (this.applicantId == '6720725862ac560c970e17e7') {
              text = '50.51';
            } else if (this.applicantId == '671a0fe69cbf85c546dfd4fc') {
              text = '65.20'
            } else if (this.applicantId == '67206daf62ac560c970e17c3') {
              text = '60.03';
            } else if (this.applicantId == '6720742462ac560c970e181d') {
              text = '46.78';
            } else if (this.applicantId == '672074fb62ac560c970e1826') {
              text = '32.21';
            } else if (this.applicantId == '67206e3462ac560c970e17cc') {
              text = '55.90';
            } else if (this.applicantId == '6720728f62ac560c970e17f0') {
              text = '55.57';
            } else if (this.applicantId == '672071e062ac560c970e17d5') {
              text = '28.27';
            } else if (this.applicantId == '672072ed62ac560c970e17f9') {
              text = '44.94';
            } else if (this.applicantId == '6720735462ac560c970e180b') {
              text = '62.43'
            } else if (this.applicantId == '672075a462ac560c970e182f') {
              text = '23.38'
            } else if (this.applicantId == '67206b4962ac560c970e17ba') {
              text = '21.47'
            } else if (this.applicantId == '672075d762ac560c970e1838') {
              text = '38.01';
            } else if (this.applicantId == '6720739362ac560c970e1814') {
              text = '52.89';
            } else if (this.applicantId == '67a478480d6b57a1b27f6cd9') {
              text = '46.48';
            } else if (this.applicantId == '671f577ada2bbf3fe2df3e0e') {
              text = '61.46';
            } else if (this.applicantId == '6720732662ac560c970e1802') {
              text = '62.15';
            }
          }



          ctx.fillText(text, centerX, centerY);
          ctx.restore();
        },
      },
    ],
  };
  companyName: string = "";

  gCount: number = 0;
  dCount: number = 0;
  cCount: number = 0;

  hsCount: number = 0;
  hrCount: number = 0;



  async getAllApplicantsAndMarks(applicantId: string) {
    this.loaderService.showLoading();

    try {
      const responses = await lastValueFrom(
        forkJoin({
          company: this.apiService.getById('get-company-marks', applicantId),
          questionnaire: this.apiService.post(`get-questionnaire`, { id: applicantId, financialYear: this.financialYear })
        })
      );

      this.loaderService.hideLoading();

      const companyResp = responses.company;
      const questionnaireResp = responses.questionnaire;

      if (companyResp.status === 'success') {
        this.companyName = companyResp.companyName;

        // Process company marks
        companyResp.data.forEach((result: any) => {
          const category = result.appliCategory;
          if (this.categoryList.hasOwnProperty(category)) {
            this.categoryList[category].push(result);
          }
        });

        this.questions = Object.values(this.categoryList).map((item: any) => item[0]);
        // console.log(this.questions, "Questions from company marks");
        let answers = questionnaireResp.data[0].answers;

        let dummy: any[] = [];
        let filteredAndSorted = this.questionnaireSeriesList
          .sort((a, b) => a.position - b.position);
        let dataHolder = [...answers, ...filteredAndSorted];
        filteredAndSorted = Array.from(
          new Map(dataHolder.map(item => [item.questionId, item])).values()
        );
        filteredAndSorted.forEach((itm: any) => {
          let item = answers.find((items: any) => itm.questionId == items.questionId);
          if (item.answer && Array.isArray(item.assessorResp)) {
            dummy.push(item);
          } else {
            console.log("item: ", item);
          }
        });
        answers = dummy;
        const categories = {
          General: 'gCount',
          Decarbonization: 'dCount',
          Circularity: 'cCount',
          'Health & Safety': 'hsCount',
          'Human Rights': 'hrCount'
        };

        const categoryScores: Record<string, { totalObtendMark: number; totalMark: number; totalPercentageOfCategory: number; questions: any[] }> = {};

        Object.entries(categories).forEach(([category, countKey]) => {
          // console.log([
          //   { answers: answers.filter((item: any) => item.category === category) }
          // ]);

          const filteredApplicantMarkData = this.utilityService.filterQuestionaireMarks([
            { answers: answers.filter((item: any) => item.category === category) }
          ]);

            const filteredOnlyForAssessorMarkData = this.utilityService.filterQuestionaireMarksOnlyForAssessor([
            { answers: answers.filter((item: any) => item.category === category) }
          ]);

          

          // console.log(filteredApplicantMarkData);

          const filteredData = this.utilityService.filterQuestionaireMarksForAssessor([
            { answers: answers.filter((item: any) => item.category === category) }
          ]);

          filteredData[0]?.answers.forEach((element: any) => {
            let appliQuestion = filteredApplicantMarkData[0]?.answers.find(
              (item: any) => item.questionId === element.questionId
            );

               let assessorQuestion = filteredOnlyForAssessorMarkData[0]?.answers.find(
              (item: any) => item.questionId === element.questionId
            );
          
            if(assessorQuestion) {
               element.maxMark = assessorQuestion.maxMark;
              element.assessorObtendMark = assessorQuestion.obtendMark;
            }
            if (appliQuestion) {
              element.maxMark = assessorQuestion.maxMark;
              element.applicantObtendMark = appliQuestion.obtendMark;
            }
          
          });

          const totalObtendMark = filteredData[0].answers.reduce((acc, item) => Number(acc) + (Number(item.obtendMark) || 0), 0);

          const totalMark = filteredData[0].answers.reduce((acc, item) => {
            if (item.isMarks && item.maxMark != null && Number(item.maxMark) !== 0) {
              return acc + Number(item.maxMark);
            }
            return acc;
          }, 0);
          // console.log(category, " : ", totalMark);

          const totalPercentageOfCategory = totalMark > 0 ? Number(((totalObtendMark / totalMark) * 100).toFixed(2)) : 0;
          const questions = filteredData[0].answers;

          categoryScores[countKey] = { totalObtendMark, totalMark, totalPercentageOfCategory, questions };
          // console.log(categoryScores);
        });

        // Assign values to instance variables & update `this.questions`
        Object.entries(categoryScores).forEach(([countKey, scores], index) => {
          // console.log(countKey, " : ", scores);
          this[countKey] = scores.totalObtendMark;
          this[`${countKey}Total`] = scores.totalMark;

          if (this.questions[index]) {
            this.questions[index].totalMark = scores.totalMark;
            this.questions[index].totalObtendMark = scores.totalObtendMark;
            this.questions[index].totalPercentageOfCategory = scores.totalPercentageOfCategory;
            this.questions[index].questions = scores.questions;
          }
        });

        // console.log(this.questions);

        if (this.financialYear == '2024') {
          // as per the client requirement 
          if (this.applicantId == '672075d762ac560c970e1838') {
            this.questions[1]['totalMark'] = 1500;
          } else if (this.applicantId == '67a478480d6b57a1b27f6cd9') {
            this.questions[3]['totalMark'] = 1800;
          } else if (this.applicantId == '671f577ada2bbf3fe2df3e0e') {
            this.questions[1]['totalMark'] = 1300;
          } else if (this.applicantId == '67206b4962ac560c970e17ba') {
            this.questions[0]['totalMark'] = 1100;
          }
        }
        // console.log(this.questions, "Table Question");
        // Initialize data sources
        [this.dataSource, this.dataSource1, this.dataSource2, this.dataSource3, this.dataSource4] =
          this.questions.map(q => new MatTableDataSource<any>(q?.questions));

        // Update total percentage and marks
        this.totalPercentageOfAllCategory = (
          this.questions.reduce((acc, category) => acc + (category.totalPercentageOfCategory || 0), 0) / 5
        ).toFixed(2);

        this.totalObtainedMarkOfAllCategory = this.questions.reduce(
          (acc, category) => acc + (category.totalObtendMark || 0),
          0
        );
        this.cd.detectChanges();
        this.updateChart();
        this.chart.render();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      this.loaderService.hideLoading();
    }
  }


  questionnaireSeriesList: any[] = [];
  getQuestionnaireSeries(): void {
    let data = {};
    data["userId"] = this.applicantId ? this.applicantId : this.userMeta?._id
    data["role"] = this.userMeta?.role;
    data['financialYear'] = this.financialYear;
    this.apiService.post('get-applicants-questionnaire', data).subscribe({
      next: (resp: any) => {
        // console.log(resp);
        this.questionnaireSeriesList = resp['data']['assessorResp'];
        this.getAllApplicantsAndMarks(this.applicantId);

      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }




  updateChart() {
    // console.log(this.questions);

    const colorMapping = {
      "General": "#F88900",
      "Decarbonization": "#6BB017",
      "Circularity": "#9CEF00",
      "Health & Safety": "#D2FF31",
      "Human Rights": "#FFEF15"
    };

    const labels = this.questions.map(q => q.appliCategory);
    let totalObtendMarkPercentage = this.questions.map((q) =>
      Number((((q.totalPercentageOfCategory) * 20) / 100).toFixed(2))
    );
    if (this.financialYear == '2024') {
      // as per the client requirement 
      if (this.applicantId == '671a0fe69cbf85c546dfd4fc') {
        totalObtendMarkPercentage = [13.29, 13.70, 12.10, 13.40, 12.71];
      } else if (this.applicantId == '6720725862ac560c970e17e7') {
        totalObtendMarkPercentage = [12.86, 4.77, 8.50, 15.46, 8.92];
      } else if (this.applicantId == '67206daf62ac560c970e17c3') {
        totalObtendMarkPercentage = [13.21, 11.4, 8.33, 16, 11.08];
      } else if (this.applicantId == '6720742462ac560c970e181d') {
        totalObtendMarkPercentage = [13.08, 4.07, 7.5, 13.46, 8.67];
      }
      else if (this.applicantId == '672074fb62ac560c970e1826') {
        totalObtendMarkPercentage = [7.92, 3.53, 1.82, 12.77, 6.17];
      }
      else if (this.applicantId == '67206e3462ac560c970e17cc') {
        totalObtendMarkPercentage = [15.79, 8.12, 7.73, 14.77, 9.50];
      } else if (this.applicantId == '6720728f62ac560c970e17f0') {
        totalObtendMarkPercentage = [11.31, 10.13, 7.8, 18.17, 8.17]
      } else if (this.applicantId == '672071e062ac560c970e17d5') {
        totalObtendMarkPercentage = [7.12, 2.58, 0, 10.47, 8.09];
      } else if (this.applicantId == '672072ed62ac560c970e17f9') {
        totalObtendMarkPercentage = [13.21, 5.88, 4.42, 12.92, 8.50]
      } else if (this.applicantId == '6720735462ac560c970e180b') {
        totalObtendMarkPercentage = [17.08, 10.27, 9.80, 14.46, 10.82];
      } else if (this.applicantId == '672075a462ac560c970e182f') {
        totalObtendMarkPercentage = [9.46, 2, 0, 6.92, 5];
      } else if (this.applicantId == '67206b4962ac560c970e17ba') {
        totalObtendMarkPercentage = [8, 2.26, 0, 3.38, 7.83];
      } else if (this.applicantId == '672075d762ac560c970e1838') {
        totalObtendMarkPercentage = [9.69, 2.67, 5.83, 10.15, 9.67];
      } else if (this.applicantId == '6720739362ac560c970e1814') {
        totalObtendMarkPercentage = [12.33, 9.44, 5.33, 14.62, 11.17];
      } else if (this.applicantId == '67a478480d6b57a1b27f6cd9') {
        totalObtendMarkPercentage = [10.29, 6.83, 2.4, 16.46, 10.5];
      } else if (this.applicantId == '671f577ada2bbf3fe2df3e0e') {
        totalObtendMarkPercentage = [14.38, 7.23, 12, 15.77, 12.08];
      } else if (this.applicantId == '6720732662ac560c970e1802') {
        totalObtendMarkPercentage = [17.77, 10.03, 7.33, 15.85, 11.17];
      }
    }


    this.chartData = labels.map(label => ({
      name: label,
      value: totalObtendMarkPercentage.find((_, index) => labels[index] === label),
      color: colorMapping[label] || "#000000" // Default to black if no match
    }));

    // Calculate total value
    this.totalValue = this.chartData.reduce((acc, el) => acc + el.value, 0);

    // Calculate percentage of the first value
    this.percentage = Math.round((this.chartData[0].value / this.totalValue) * 100);

    // console.log("Colors: ", this.chartData.map((el) => el.color));

    this.data = {
      labels: this.chartData.map((el) => el.name),
      datasets: [
        {
          data: this.chartData.map((el) => Number(el.value.toFixed(2))),
          backgroundColor: this.chartData.map((el) => el.color),
          cutout: "70%",
          circumference: 180,
          rotation: 270,
        },
      ],
    };

    if (this.mycharts) {

      this.mycharts.data.labels = this.chartData.map((el) => el.name);
      // this.mycharts.data.datasets[0].data = this.chartData.map((el) => el.value);
      this.mycharts.data.datasets[0].data = this.chartData.map((el) => Number(el.value.toFixed(2))),

        this.mycharts.data.datasets[0].backgroundColor = this.chartData.map((el) => el.color);
      if (this.financialYear == '2024') {
        // as per the client requirement 
        if (this.applicantId == '671a0fe69cbf85c546dfd4fc' ||
          this.applicantId == '6720725862ac560c970e17e7' ||
          this.applicantId == '67206daf62ac560c970e17c3' ||
          this.applicantId == '6720742462ac560c970e181d' ||
          this.applicantId == '672074fb62ac560c970e1826' ||
          this.applicantId == '67206e3462ac560c970e17cc' ||
          this.applicantId == '6720728f62ac560c970e17f0' ||
          this.applicantId == '672071e062ac560c970e17d5' ||
          this.applicantId == '672072ed62ac560c970e17f9' ||
          this.applicantId == '6720735462ac560c970e180b' ||
          this.applicantId == '672075a462ac560c970e182f' ||
          this.applicantId == '67206b4962ac560c970e17ba' ||
          this.applicantId == '672075d762ac560c970e1838' ||
          this.applicantId == '6720739362ac560c970e1814' ||
          this.applicantId == '67a478480d6b57a1b27f6cd9' ||
          this.applicantId == '671f577ada2bbf3fe2df3e0e' ||
          this.applicantId == '6720732662ac560c970e1802'
        ) {
          this.mycharts.data.datasets[0].data = totalObtendMarkPercentage;
        }
      }

      this.mycharts.update();
    }


    // console.log(totalObtendMarkPercentage);
    if (this.charts) {
      if (!this.charts) return;

      if (this.charts.data.datasets.length >= 2) {
        this.charts.data.labels = labels;
        this.charts.data.datasets[0].data = [20, 20, 20, 20, 20];
        this.charts.data.datasets[1].data = totalObtendMarkPercentage;
        // this.charts.data.datasets[1].backgroundColor = labels.map(label => colorMapping[label]);
        this.charts.update();
      } else {
        console.error("Chart datasets are not properly initialized!");
      }
    } else {
      this.charts = new Chart("canvas", {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Total",
              data: [20, 20, 20, 20, 20],
              // backgroundColor: "rgba(220, 220, 220, 0.3)",
              borderWidth: 0,
              stack: "Stack 0",
              borderRadius: { topLeft: 10, topRight: 10 },
              borderSkipped: "bottom",
            },
            {
              label: "Actual",
              data: totalObtendMarkPercentage,
              backgroundColor: labels.map(label => colorMapping[label]), // Use the same color mapping
              borderWidth: 0,
              stack: "Stack 0",
              borderRadius: { topLeft: 10, topRight: 10 },
              borderSkipped: "bottom",
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            },
            datalabels: {
              textAlign: "center",
              anchor: "end",
              align: "bottom",
              color: "#000",
              font: {
                size: 12
              },
              padding: {
                bottom: 6
              },
              formatter: (value) => Number(value).toFixed(2) // Display actual value
            }
          },
          scales: {
            x: {
              stacked: false,
              grid: {
                display: false
              },
            },
            y: {
              stacked: false,
              beginAtZero: true,
              ticks: {
                format: { maximumFractionDigits: 2, minimumFractionDigits: 2 },
                // callback: function (value: any, index: any, values: any) {
                //   let val = "" + value.toFixed(2);
                //   console.log(val)
                //   return val
                // }
              }
            }
          }
        }
      });
    }
  }






  @ViewChildren('pdfSection1') pdfSections1!: QueryList<ElementRef>;
  @ViewChildren('pdfSection2') pdfSections2!: QueryList<ElementRef>;

  @ViewChildren('pdfSection3') pdfSections3!: QueryList<ElementRef>;
  @ViewChildren('pdfSection4') pdfSections4!: QueryList<ElementRef>;


  pdfArray: Uint8Array[] = [];

  // Capture each section and add it as an image to a PDF
  isLoad = signal(false);
  selectedSection: string[] = [];
  async captureAndAddPdf() {
    this.alertService.confirmDialog(
      'Download PDF',
      'Do you want to download the PDF?'
    ).subscribe({
      next: async (isConfirm: boolean) => {
        if (isConfirm) {
          // this.isLoad=true;
          this.isLoad.set(!this.isLoad());
          // Select sections based on condition
          setTimeout(async () => {
            let selectedSections: QueryList<ElementRef>;
            selectedSections = this.pdfSections1;

            for (let section of selectedSections) {
              // Hide elements you don't want in the PDF
              const elementsToHide = section.nativeElement.querySelectorAll('.fixfooter');
              elementsToHide.forEach(async (el) => el.style.display = 'none');

              //✅ Capture the section 
              const canvas = await html2canvas(section.nativeElement, { scale: 2 });
              const imgData = canvas.toDataURL('image/png');
              const imgBytes = this.base64ToUint8Array(imgData.split(',')[1]);

              const pdfDoc = await PDFDocument.create();
              const pngImage = await pdfDoc.embedPng(imgBytes);
              const page = pdfDoc.addPage([canvas.width, canvas.height]);
              page.drawImage(pngImage, {
                x: 0,
                y: 0,
                width: canvas.width,
                height: canvas.height
              });

              const pdfBytes = await pdfDoc.save();
              this.pdfArray.push(pdfBytes);

              elementsToHide.forEach(el => el.style.display = '');
            }

            // this.alertService.successSnackBar('Section Added as PDF','OK','top-right');


            if (this.pdfArray.length === 0) {
              // alert('No PDFs to merge!');
              this.alertService.errorSnackBar('No PDFs to merge!', 'OK', 'top-right');
              return;
            }

            const mergedPdf = await PDFDocument.create();

            for (const pdfBytes of this.pdfArray) {
              const pdf = await PDFDocument.load(pdfBytes);
              const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
              copiedPages.forEach(page => mergedPdf.addPage(page));
            }

            const finalPdfBytes = await mergedPdf.save();
            saveAs(new Blob([finalPdfBytes], { type: 'application/pdf' }), 'Score_card.pdf');
            this.isLoad.set(!this.isLoad());

            this.alertService.successSnackBar('PDF Downloaded Successfully', 'OK', 'top-right');
          }, 1500);

        }
      }
    });

  }


  // Merge all captured PDFs and download


  // Convert base64 to Uint8Array
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }


  onMarkChanged(element: any) {
  // console.log("Change mark updated:", element);
  // ✅ Add your custom logic here
  this.saveAsNext(element);
}


        saveAsNext(data: any): void {
  of(data).pipe(
    debounceTime(500), // wait 500ms before firing
    switchMap((latestData) => {
      let userId = this.applicantId;
      let body = { 
        applicant_id: userId, 
        role: 'admin',
        adminResp: latestData,
        financialYear: this.financialYear,
          questionId: latestData.questionId
      };

      // console.log('Saving after debounce:', body);
      return this.apiService.post('updateSingleQuestionnaireMarkByAdmin', body);
    })
  )
  .subscribe({
    next: (resp: any) => {
      if (resp['status'] === 'success') {
        console.log('Save successful');
      }
    },
    error: (err: any) => {
      console.error('Save failed:', err);
    }
  });
}
    
onScoringChanged(data:any){
 let element = data;
 element['isMarks'] = !data?.isMarks;
 element['maxMark'] = data?.isMarks?100:0;

  // console.log(data);
  this.alertService.confirmDialog('Confirmation','Are you sure you want to change the scoring?')
    .subscribe((isConfirm:boolean) => {
      if (isConfirm) {
        this.saveAsNext(element);
      }
    });
}

}

