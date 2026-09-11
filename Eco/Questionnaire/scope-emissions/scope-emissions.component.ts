import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MaxWordLengthDirective } from '../../../directive/max-word-length.directive';
import {MatRadioModule} from '@angular/material/radio';
import {MatIconModule} from '@angular/material/icon';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
const Emission2Data={
  purchaseCons:0,
  purchaseNet:0.79,
  purchaseTJ:0,
  purchaseCO2Fac:0,
  purchaseTotal:0,
 }
const Emission1Data = {
  lpgCons:0,
  lpgNet:0.0468,
  lpgTJ:0,
  lpgCO2Fac:2.93929,
  lpgTotal:0,

  naturalGasCons:0,
  naturalGasNet:0.048,
  naturalGasTJ:0,
  naturalGasCO2Fac:2.53848,
  naturalGasTotal:0,

  aviationSpiritCons:0,
  aviationSpiritNet:0.0443,
  aviationSpiritTJ:0,
  aviationSpiritCO2Fac:3.19276,
  aviationSpiritTotal:0,

  dieselCons:0,
  dieselNet:0.0448,
  dieselTJ:0,
  dieselCO2Fac:3.20876,
  dieselTotal:0,

  fuelOilCons:0,
  fuelOilNet:0.0404,
  fuelOilTJ:0,
  fuelOilCO2Fac:3.2292,
  fuelOilTotal:0,

  lubricantsCons:0,
  lubricantsNet:0.0402,
  lubricantsTJ:0,
  lubricantsCO2Fac:3.18143,
  lubricantsTotal:0,

  naphthaCons:0,
  naphthaNet:0.0445,
  naphthaTJ:0,
  naphthaCO2Fac:3.14287,
  naphthaTotal:0,

  petrolCons:0,
  petrolNet:0.0443,
  petrolTJ:0,
  petrolCO2Fac:3.1539,
  petrolTotal:0,

  wasteOilsCons:0,
  wasteOilsNet:0.0402,
  wasteOilsTJ:0,
  wasteOilsCO2Fac:3.22456,
  wasteOilsTotal:0,

  anthraciteCoalCons:0,
  anthraciteCoalNet:0.0267,
  anthraciteCoalTJ:0,
  anthraciteCoalCO2Fac:2.40384,
  anthraciteCoalTotal:0,


  petroleumCokeCons:0,
  petroleumCokeNet:0.0325,
  petroleumCokeTJ:0,
  petroleumCokeCO2Fac:3.38686,
  petroleumCokeTotal:0,

  HFC32Cons:0,
  HFC32Net:0.675,
  HFC32TJ:0,
  HFC32CO2Fac:0,
  HFC32Total:0,

  HFC125Cons:0,
  HFC125Net:3.5,
  HFC125TJ:0,
  HFC125CO2Fac:0,
  HFC125Total:0,

  HFC134Cons:0,
  HFC134Net:1.43,
  HFC134TJ:0,            //   value="Tonnes"   CO2Fac
  HFC134CO2Fac:0,
  HFC134Total:0,

  HFC152Cons:0,
  HFC152Net:0.124,
  HFC152TJ:0,
  HFC152CO2Fac:0,
  HFC152Total:0,

  HFC227Cons:0,
  HFC227Net:3.22,
  HFC227TJ:0,
  HFC227CO2Fac:0,
  HFC227Total:0,

  HFC236Cons:0,
  HFC236Net:9.81,
  HFC236TJ:0,
  HFC236CO2Fac:0,
  HFC236Total:0,

  R404ACons:0,
  R404ANet:3.922,
  R404ATJ:0,
  R404ACO2Fac:0,
  R404ATotal:0,

  R407CCons:0,
  R407CNet:3.922,
  R407CTJ:0,
  R407CCO2Fac:0,
  R407CTotal:0,

  R410ACons:0,
  R410ANet:1.774,
  R410ATJ:0,
  R410ACO2Fac:0,
  R410ATotal:0,

  othersCons:0,
  othersNet:2.088,
  othersTJ:0,
  othersCO2Fac:0,
  othersTotal:0
 };

@Component({
  selector: 'app-scope-emissions',
  standalone: true,
  imports: [ReactiveFormsModule,
    CommonModule,
    MatFormFieldModule,
    MaxWordLengthDirective,
    MatDialogTitle,
    FormsModule,
    CommonModule,
    MatRadioModule,
    MatDialogContent,
    MatDialogActions,
    MatIconModule,
    MatDialogClose],
  templateUrl: './scope-emissions.component.html',
  styleUrl: './scope-emissions.component.css',
  animations: [
    trigger('bubbleHighlight', [
      state('default', style({
        transform: 'scale(1)',
        backgroundColor: '#F6871F',
        boxShadow: 'none',
      })),
      state('active', style({
        transform: 'scale(1)',
        backgroundColor: '#F6871F',
        boxShadow: 'none',
      })),
      transition('default <=> active', [
        animate(
          '2.2s',
          keyframes([
            style({ transform: 'scale(1.2)', backgroundColor: 'yellow', offset: 0.2 }),
            style({ transform: 'scale(1)', backgroundColor: '#F6871F', offset: 0.5 }),
            style({ transform: 'scale(1.2)', backgroundColor: 'yellow', offset: 0.7 }),
            style({ transform: 'scale(1)', backgroundColor: '#F6871F', offset: 1.0 }),
          ])
        ),
      ]),
    ]),
  ],
 
})
export class ScopeEmissionsComponent {
emission1Form:FormGroup;
emission2Form:FormGroup;
totalOfTotals:number=0;
years:any[]=[];
patchValueData:any;
allSelectedFields:number[]=[2022];
@ViewChild('myElement') myElement!: ElementRef;
animationState = 'default';

  constructor(private fb:FormBuilder,
    private dialogRef: MatDialogRef<ScopeEmissionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.yearGenerator();
    console.log(this.data);


   this.emission1Form=this.fb.group({
    lpgCons:[0],
    lpgNet:[0.0468],
    lpgTJ:[0],
    lpgCO2Fac:[2.93929],
    lpgTotal:[0],

      naturalGasCons: [0],
      naturalGasNet: [0.048],
      naturalGasTJ: [0],
      naturalGasCO2Fac: [2.53848],
      naturalGasTotal: [0],

      aviationSpiritCons: [0],
      aviationSpiritNet: [0.0443],
      aviationSpiritTJ: [0],
      aviationSpiritCO2Fac: [3.19276],
      aviationSpiritTotal: [0],

      dieselCons: [0],
      dieselNet: [0.0448],
      dieselTJ: [0],
      dieselCO2Fac: [3.20876],
      dieselTotal: [0],

      fuelOilCons: [0],
      fuelOilNet: [0.0404],
      fuelOilTJ: [0],
      fuelOilCO2Fac: [3.2292],
      fuelOilTotal: [0],

      lubricantsCons: [0],
      lubricantsNet: [0.0402],
      lubricantsTJ: [0],
      lubricantsCO2Fac: [3.18143],
      lubricantsTotal: [0],

      naphthaCons: [0],
      naphthaNet: [0.0445],
      naphthaTJ: [0],
      naphthaCO2Fac: [3.14287],
      naphthaTotal: [0],

      petrolCons: [0],
      petrolNet: [0.0443],
      petrolTJ: [0],
      petrolCO2Fac: [3.1539],
      petrolTotal: [0],

      wasteOilsCons: [0],
      wasteOilsNet: [0.0402],
      wasteOilsTJ: [0],
      wasteOilsCO2Fac: [3.22456],
      wasteOilsTotal: [0],

      anthraciteCoalCons: [0],
      anthraciteCoalNet: [0.0267],
      anthraciteCoalTJ: [0],
      anthraciteCoalCO2Fac: [2.40384],
      anthraciteCoalTotal: [0],


      petroleumCokeCons: [0],
      petroleumCokeNet: [0.0325],
      petroleumCokeTJ: [0],
      petroleumCokeCO2Fac: [3.38686],
      petroleumCokeTotal: [0],

      HFC227Cons: [0],  //
      HFC227Net: [3.22],
      HFC227TJ: [0],
      HFC227CO2Fac: [0],
      HFC227Total: [0],

      HFC236Cons: [0], //
      HFC236Net: [9.81],
      HFC236TJ: [0],
      HFC236CO2Fac: [0],
      HFC236Total: [0],

      R404ACons: [0],  //
      R404ANet: [3.922],
      R404ATJ: [0],
      R404ACO2Fac: [0],
      R404ATotal: [0],

      R407CCons: [0], //
      R407CNet: [3.922],
      R407CTJ: [0],
      R407CCO2Fac: [0],
      R407CTotal: [0],

      R410ACons: [0],  //
      R410ANet: [1.774],
      R410ATJ: [0],
      R410ACO2Fac: [0],
      R410ATotal: [0],
    carbonOioxideNet: [0.001],
    carbonOioxideCons: [0], 
    carbonOioxideTJ:[0],
    carbonOioxideFac:[0],
    carbonOioxideTotal:[0],

    methaneNet: [0.025],
    methaneCons: [0], 
    methaneTJ:[0],
    methaneFac:[0],
    methaneTotal:[0],

    nitrousOxideNet: [0.298],
    nitrousOxideCons: [0], 
    nitrousOxideTJ:[0],
    nitrousOxideFac:[0],
    nitrousOxideTotal:[0],


    HFC23Net: [14.8],
    HFC23Cons: [0], 
    HFC23TJ:[0],
    HFC23Fac:[0],
    HFC23Total:[0],

    // HFC32: 0.675, //
    HFC32Cons: [0],
    HFC32Net: [0.675],
    HFC32TJ: [0],
    HFC32CO2Fac: [0],
    HFC32Total: [0],

    HFC41Net: [0.092],
      HFC41Cons: [0], 
    HFC41TJ:[0],
    HFC41Fac:[0],
    HFC41Total:[0],

    // HFC125: 3.5, //
    HFC125Cons: [0], //
    HFC125Net: [3.5],
    HFC125TJ: [0],
    HFC125CO2Fac: [0],
    HFC125Total: [0],


    // HFC134: 1.3, //
    HFC134Cons: [0],  //
    HFC134Net: [1.43],
    HFC134TJ: [0],            
    HFC134CO2Fac: [0],
    HFC134Total: [0],


    HFC134aNet: [1.43],
    HFC134aCons: [0], 
    HFC134aTJ:[0],
    HFC134aFac:[0],
    HFC134aTotal:[0],

    HFC143Net: [0.353],
    HFC143Cons: [0], 
    HFC143TJ:[0],
    HFC143Fac:[0],
    HFC143Total:[0],

    HFC143aNet: [4.47],
    HFC143aCons: [0], 
    HFC143aTJ:[0],
    HFC143aFac:[0],
    HFC143aTotal:[0],

    HFC152aNet: [0.124],
    HFC152aCons: [0], 
    HFC152aTJ:[0],
    HFC152aFac:[0],
    HFC152aTotal:[0],

    HFC227eaNet: [3.22],
    HFC227eaCons: [0], 
    HFC227eaTJ:[0],
    HFC227eaFac:[0],
    HFC227eaTotal:[0],
    
    HFC236faNet: [9.19],
    HFC236faCons: [0], 
    HFC236faTJ:[0],
    HFC236faFac:[0],
    HFC236faTotal:[0],

  

    HFC245faNet: [1.03],
    HFC245faCons: [0], 
    HFC245faTJ:[0],
    HFC245faFac:[0],
    HFC245faTotal:[0],

    HFC4310meeNet: [1.64],
    HFC4310meeCons: [0], 
    HFC4310meeTJ:[0],
    HFC4310meeFac:[0],
    HFC4310meeTotal:[0],
    
    perfluoromethanePFC14Net: [7.39],
    perfluoromethanePFC14Cons: [0], 
    perfluoromethanePFC14TJ:[0],
    perfluoromethanePFC14Fac:[0],
    perfluoromethanePFC14Total:[0],

    perfluoroethanePFC116Net: [12.2],
    perfluoroethanePFC116Cons: [0], 
    perfluoroethanePFC116TJ:[0],
    perfluoroethanePFC116Fac:[0],
    perfluoroethanePFC116Total:[0],

    perfluoropropanePFC218Net: [8.83],
    perfluoropropanePFC218Cons: [0], 
    perfluoropropanePFC218TJ:[0],
    perfluoropropanePFC218Fac:[0],
    perfluoropropanePFC218Total:[0],

    perfluorocyclobutanePFC318Net: [10.84],
    perfluorocyclobutanePFC318Cons: [0], 
    perfluorocyclobutanePFC318TJ:[0],
    perfluorocyclobutanePFC318Fac:[0],
    perfluorocyclobutanePFC318Total:[0],

    perfluorobutanePFC3110Net: [8.86],
    perfluorobutanePFC3110Cons: [0], 
    perfluorobutanePFC3110TJ:[0],
    perfluorobutanePFC3110Fac:[0],
    perfluorobutanePFC3110Total:[0],

    perfluoropentanePFC4112Net: [9.16],
    perfluoropentanePFC4112Cons: [0], 
    perfluoropentanePFC4112TJ:[0],
    perfluoropentanePFC4112Fac:[0],
    perfluoropentanePFC4112Total:[0],

    perfluorohexanePFC5114Net: [9.33],
    perfluorohexanePFC5114Cons: [0], 
    perfluorohexanePFC5114TJ:[0],
    perfluorohexanePFC5114Fac:[0],
    perfluorohexanePFC5114Total:[0],


    pFC9118Net: [7.5],
    pFC9118Cons: [0], 
    pFC9118TJ:[0],
    pFC9118Fac:[0],
    pFC9118Total:[0],

    perfluorocyclopropaneNet: [17.34],
    perfluorocyclopropaneCons: [0], 
    perfluorocyclopropaneTJ:[0],
    perfluorocyclopropaneFac:[0],
    perfluorocyclopropaneTotal:[0],

    sulphurhexafluorideSF6Net: [22.8],
    sulphurhexafluorideSF6Cons: [0], 
    sulphurhexafluorideSF6TJ:[0],
    sulphurhexafluorideSF6Fac:[0],
    sulphurhexafluorideSF6Total:[0],

    // HFC152:0.053,//
    HFC152Cons: [0], //
    HFC152Net: [0.053],
    HFC152TJ: [0],
    HFC152CO2Fac: [0],
    HFC152Total: [0],

    HFC161Net:[0.012],
    HFC161Cons: [0], 
    HFC161TJ:[0],
    HFC161Fac:[0],
    HFC161Total:[0],

    HFC236cbNet:[1.34],
    HFC236cbCons: [0], 
    HFC236cbTJ:[0],
    HFC236cbFac:[0],
    HFC236cbTotal:[0],

    HFC236eaNet:[1.37],
    HFC236eaCons: [0], 
    HFC236eaTJ:[0],
    HFC236eaFac:[0],
    HFC236eaTotal:[0],

    HFC245caNet:[0.693],
    HFC245caCons: [0], 
    HFC245caTJ:[0],
    HFC245caFac:[0],
    HFC245caTotal:[0],

    HFC365mfcNet:[0.794],
    HFC365mfcCons: [0], 
    HFC365mfcTJ:[0],
    HFC365mfcFac:[0],
    HFC365mfcTotal:[0],

  nitrogentrifluorideNet:[17.2],
  nitrogentrifluorideCons: [0], 
  nitrogentrifluorideTJ:[0],
  nitrogentrifluorideFac:[0],
  nitrogentrifluorideTotal:[0],

  R401ANet:[0.016],
  R401ACons: [0], 
  R401ATJ:[0],
  R401AFac:[0],
  R401ATotal:[0],

  R401BNet:[0.014],
    R401BCons: [0], 
   R401BTJ:[0],
    R401BFac:[0],
    R401BTotal:[0],


  R401CNet:[0.019],
  R401CCons: [0], 
  R401CTJ:[0],
  R401CFac:[0],
  R401CTotal:[0],

  R402ANet:[2.1],
  R402ACons: [0], 
  R402ATJ:[0],
  R402AFac:[0],
  R402ATotal:[0],

  R402BNet:[1.33],
  R402BCons: [0], 
  R402BTJ:[0],
  R402BFac:[0],
  R402BTotal:[0],

  R403ANet:[1.766],
  R403ACons: [0], 
  R403ATJ:[0],
  R403AFac:[0],
  R403ATotal:[0],

  R403BNet:[3.444],
  R403BCons: [0], 
  R403BTJ:[0],
  R403BFac:[0],
  R403BTotal:[0],

  // R404A: 3.922, //

  // R404ACons: [0],  //
  // R404ANet: [3.922],
  // R404ATJ: [0],
  // R404ACO2Fac: [0],
  // R404ATotal: [0],



R405ANet: [3.774],
R405ACons: [0], 
R405ATJ:[0],
R405AFac:[0],
R405ATotal:[0],

R407ANet: [2.107],
  R407ACons: [0], 
  R407ATJ:[0],
  R407AFac:[0],
  R407ATotal:[0],

R407BNet: [2.804],
R407BCons: [0], 
R407BTJ:[0],
R407BFac:[0],
R407BTotal:[0],

// R407C: 1.774, //
// R407CCons: [0], //
// R407CNet: [3.922],
// R407CTJ: [0],
// R407CCO2Fac: [0],
// R407CTotal: [0],



R407DNet: [1.627],
R407DCons: [0], 
R407DTJ:[0],
R407DFac:[0],
R407DTotal:[0],

R407ENet: [1.552],
R407ECons: [0], 
R407ETJ:[0],
R407EFac:[0],
R407ETotal:[0],

R407FNet: [1.825],
R407FCons: [0], 
R407FTJ:[0],
R407FFac:[0],
R407FTotal:[0],

R408ANet: [2.301],
R408ACons: [0], 
R408ATJ:[0],
R408AFac:[0],
R408ATotal:[0],

// R410A: 2.088, //

// R410ACons: [0],  //
// R410ANet: [1.774],
// R410ATJ: [0],
// R410ACO2Fac: [0],
// R410ATotal: [0],

R410BNet: [2.229],
R410BCons: [0], 
R410BTJ:[0],
R410BFac:[0],
R410BTotal:[0],

R411ANet: [0.014],
R411ACons: [0], 
R411ATJ:[0],
R411AFac:[0],
R411ATotal:[0],

R411BNet: [0.004],
R411BCons: [0], 
R411BTJ:[0],
R411BFac:[0],
R411BTotal:[0],

R412ANet: [0.442],
R412ACons: [0], 
R412ATJ:[0],
R412AFac:[0],
R412ATotal:[0],


R413ANet: [2.053],
R413ACons: [0], 
R413ATJ:[0],
R413AFac:[0],
R413ATotal:[0],


R415ANet: [0.022],
R415ACons: [0], 
R415ATJ:[0],
R415AFac:[0],
R415ATotal:[0],

R415BNet: [0.093],
R415BCons: [0], 
R415BTJ:[0],
R415BFac:[0],
R415BTotal:[0],

//Up Done


R416ANet: [0.844],
R416ACons: [0], 
R416ATJ:[0],
R416AFac:[0],
R416ATotal:[0],

R417ANet: [2.346],
R417ACons: [0], 
R417ATJ:[0],
R417AFac:[0],
R417ATotal:[0],

R417BNet: [3.027],
R417BCons: [0], 
R417BTJ:[0],
R417BFac:[0],
R417BTotal:[0],



R417CNet: [1.809],
R417CCons: [0], 
R417CTJ:[0],
R417CFac:[0],
R417CTotal:[0],

R418ANet: [0.003],
  R418ACons: [0], 
R418ATJ:[0],
R418AFac:[0],
R418ATotal:[0],

R419ANet: [2.967],
R419ACons: [0], 
R419ATJ:[0],
R419AFac:[0],
R419ATotal:[0],

R419BNet: [2.384],
R419BCons: [0], 
R419BTJ:[0],
R419BFac:[0],
R419BTotal:[0],

R420ANet: [1.258],
R420ACons: [0], 
R420ATJ:[0],
R420AFac:[0],
R420ATotal:[0],

R421ANet: [2.631],
R421ACons: [0], 
R421ATJ:[0],
R421AFac:[0],
R421ATotal:[0],

R421BNet: [3.19],
R421BCons: [0], 
R421BTJ:[0],
R421BFac:[0],
R421BTotal:[0],

R422ANet: [3.143],
R422ACons: [0], 
R422ATJ:[0],
R422AFac:[0],
R422ATotal:[0],

R422BNet: [2.526],
R422BCons: [0], 
R422BTJ:[0],
R422BFac:[0],
R422BTotal:[0],

R422CNet: [3.085],
R422CCons: [0], 
R422CTJ:[0],
R422CFac:[0],
R422CTotal:[0],

R422DNet: [2.729],
R422DCons: [0], 
R422DTJ:[0],
R422DFac:[0],
R422DTotal:[0],

R422ENet: [2.592],
R422ECons: [0], 
R422ETJ:[0],
R422EFac:[0],
R422ETotal:[0],

R423ANet: [2.28],
R423ACons: [0], 
R423ATJ:[0],
R423AFac:[0],
R423ATotal:[0],


R424ANet: [2.44],
R424ACons: [0], 
R424ATJ:[0],
R424AFac:[0],
R424ATotal:[0],

R425ANet: [1.505],
R425ACons: [0], 
R425ATJ:[0],
R425AFac:[0],
R425ATotal:[0],

R426ANet: [1.508],
R426ACons: [0], 
R426ATJ:[0],
R426AFac:[0],
R426ATotal:[0],

R427ANet: [2.138],
R427ACons: [0], 
R427ATJ:[0],
R427AFac:[0],
R427ATotal:[0],

R428ANet: [3.607],
R428ACons: [0], 
R428ATJ:[0],
R428AFac:[0],
R428ATotal:[0],

R429ANet: [0.012],
R429ACons: [0], 
R429ATJ:[0],
R429AFac:[0],
R429ATotal:[0],

R430ANet: [0.094],
R430ACons: [0], 
R430ATJ:[0],
R430AFac:[0],
R430ATotal:[0],

R431ANet: [0.036],
R431ACons: [0], 
R431ATJ:[0],
R431AFac:[0],
R431ATotal:[0],

R434ANet: [3.245],
R434ACons: [0], 
R434ATJ:[0],
R434AFac:[0],
R434ATotal:[0],

R435ANet: [0.025],
R435ACons: [0], 
R435ATJ:[0],
R435AFac:[0],
R435ATotal:[0],

R437ANet: [1.805],
R437ACons: [0], 
R437ATJ:[0],
R437AFac:[0],
R437ATotal:[0],

R438ANet: [2.264],
R438ACons: [0], 
R438ATJ:[0],
R438AFac:[0],
R438ATotal:[0],

R439ANet: [1.983],
R439ACons: [0], 
R439ATJ:[0],
R439AFac:[0],
R439ATotal:[0],

R440ANet: [0.144],
R440ACons: [0], 
R440ATJ:[0],
R440AFac:[0],
R440ATotal:[0],

R442ANet: [1.888],
R442ACons: [0], 
R442ATJ:[0],
R442AFac:[0],
R442ATotal:[0],

R444ANet: [0.087],
R444ACons: [0], 
R444ATJ:[0],
R444AFac:[0],
R444ATotal:[0],

R445ANet: [0.129],
R445ACons: [0], 
R445ATJ:[0],
R445AFac:[0],
R445ATotal:[0],

R500Net: [0.032],
R500Cons: [0], 
R500TJ:[0],
R500Fac:[0],
R500Total:[0],

R503Net: [5.935],
R503Cons: [0], 
R503TJ:[0],
R503Fac:[0],
R503Total:[0],

R504Net: [0.325],
R504Cons: [0], 
R504TJ:[0],
R504Fac:[0],
R504Total:[0],

R507ANet: [3.985],
R507ACons: [0], 
R507ATJ:[0],
R507AFac:[0],
R507ATotal:[0],

R508ANet: [13.214],
R508ACons: [0], 
R508ATJ:[0],
R508AFac:[0],
R508ATotal:[0],

R508BNet: [13.396],
R508BCons: [0], 
R508BTJ:[0],
R508BFac:[0],
R508BTotal:[0],

R509ANet: [4.945],
R509ACons: [0], 
R509ATJ:[0],
R509AFac:[0],
R509ATotal:[0],

CNet: [0.006],
CCons: [0], 
CTJ:[0],
CFac:[0],
CTotal:[0],

R512ANet: [0.189],
R512ACons: [0], 
R512ATJ:[0],
R512AFac:[0],
R512ATotal:[0],

othersCons:[0], //
othersNet:[2.088],
othersTJ:[0],
othersCO2Fac:[0],
othersTotal:[0],
totalOfFirst:[0]
   });
   this.emission2Form=this.fb.group({
    purchaseCons:[0],
    purchaseNet:[0.79],
    purchaseTJ:[0],
    purchaseCO2Fac:[0],
    purchaseTotal:[0],
   });
if(this.data?.detail){
  console.log(this.data);
  this.patchData('2022');
}


   }



   scrollToElement(): void {
     this.myElement.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
   }

  // this.emission1Form.patchValue(this.data[])
  date = new FormControl(new Date());
  lastThreeYears: number[] = [];


  calEmissions(inputVal: any, key: string, isSecond?: boolean): void {
    let input: number = parseFloat(inputVal);
     console.log(input," : ",key," : ",isSecond);
    let net = this.emission1Form.get(`${key}Net`).value;
    let TJ: number = (parseFloat(net) * input) ? parseFloat(net) * input : 0;
    this.emission1Form.get(`${key}TJ`)?.patchValue(TJ.toFixed(2));
    let tjVal = this.emission1Form.get(`${key}TJ`).value;
  
    let Co2 = this.emission1Form.get(`${key}CO2Fac`)?.value;
    
    let total = (parseFloat(Co2) * tjVal) ? parseFloat(Co2) * tjVal : 0;
    if (isSecond) {
      this.emission1Form.get(`${key}Total`)?.patchValue(Number(TJ.toFixed(2)));
      console.log(this.emission1Form.get(`${key}Total`).value);
    } else {
      this.emission1Form.get(`${key}Total`)?.patchValue(total.toFixed(2));
    }


    let lpgTotal = Number(this.emission1Form.get('lpgTotal').value);
    let naturalGasTotal = Number(this.emission1Form.get('naturalGasTotal').value);
    let aviationSpiritTotal =Number( this.emission1Form.get('aviationSpiritTotal').value);
    let dieselTotal = Number(this.emission1Form.get('dieselTotal').value);
    let fuelOilTotal =Number( this.emission1Form.get('fuelOilTotal').value);
    let lubricantsTotal = Number(this.emission1Form.get('lubricantsTotal').value);
    let naphthaTotal =Number( this.emission1Form.get('naphthaTotal').value);
    let petrolTotal = Number(this.emission1Form.get('petrolTotal').value);
    let wasteOilsTotal = Number(this.emission1Form.get('wasteOilsTotal').value);
    let anthraciteCoalTotal = Number(this.emission1Form.get('anthraciteCoalTotal').value);
    let petroleumCokeTotal = Number(this.emission1Form.get('petroleumCokeTotal').value);
    let HFC32Total = Number(this.emission1Form.get('HFC32Total').value);
    let HFC125Total = Number(this.emission1Form.get('HFC125Total').value);
    let HFC134Total = Number(this.emission1Form.get('HFC134Total').value);
    let HFC152Total = Number(this.emission1Form.get('HFC152Total').value);
    let HFC227Total = Number(this.emission1Form.get('HFC227Total').value);
    let HFC236Total = Number(this.emission1Form.get('HFC236Total').value);
    let R404ATotal = Number(this.emission1Form.get('R404ATotal').value);
    let R407CTotal = Number(this.emission1Form.get('R407CTotal').value);
    let R410ATotal = Number(this.emission1Form.get('R410ATotal').value);
    let othersTotal = Number(this.emission1Form.get('othersTotal').value);
    let carbonOioxideTotal = Number(this.emission1Form.get('carbonOioxideTotal').value);
    let methaneTotal = Number(this.emission1Form.get('methaneTotal').value);
    console.log(methaneTotal );


    let nitrousOxideTotal = Number(this.emission1Form.get('nitrousOxideTotal').value);

    console.log(this.emission1Form.get('HFC23Total'));
    let HFC23Total = Number(this.emission1Form.get('HFC23Total').value);



 
    let HFC41Total = Number(this.emission1Form.get('HFC41Total').value);




    let HFC134aTotal = Number(this.emission1Form.get('HFC134aTotal').value);

   
    let HFC143Total = Number(this.emission1Form.get('HFC143Total').value);

    let HFC143aTotal = Number(this.emission1Form.get('HFC143aTotal').value);


    let HFC152aTotal = Number(this.emission1Form.get('HFC152aTotal').value);

    let HFC227eaTotal = Number(this.emission1Form.get('HFC227eaTotal').value);
    //
  
    let HFC236faTotal=Number(this.emission1Form.get('HFC236faTotal').value);
    let HFC245faTotal=Number(this.emission1Form.get('HFC245faTotal').value);
    let HFC4310meeTotal=Number(this.emission1Form.get('HFC4310meeTotal').value);
    let perfluoromethanePFC14Total=Number(this.emission1Form.get('perfluoromethanePFC14Total').value);
    let perfluoroethanePFC116Total=Number(this.emission1Form.get('perfluoroethanePFC116Total').value);
    let perfluoropropanePFC218Total=Number(this.emission1Form.get('perfluoropropanePFC218Total').value);
    let perfluorocyclobutanePFC318Total=Number(this.emission1Form.get('perfluorocyclobutanePFC318Total').value);
    let perfluorobutanePFC3110Total=Number(this.emission1Form.get('perfluorobutanePFC3110Total').value);
    let perfluoropentanePFC4112Total=Number(this.emission1Form.get('perfluoropentanePFC4112Total').value);
    let perfluorohexanePFC5114Total=Number(this.emission1Form.get('perfluorohexanePFC5114Total').value);
    let pFC9118Total=Number(this.emission1Form.get('pFC9118Total').value);
    let perfluorocyclopropaneTotal=Number(this.emission1Form.get('perfluorocyclopropaneTotal').value);
    let sulphurhexafluorideSF6Total=Number(this.emission1Form.get('sulphurhexafluorideSF6Total').value);
    let HFC161Total=Number(this.emission1Form.get('HFC161Total').value);
    let HFC236cbTotal=Number(this.emission1Form.get('HFC236cbTotal').value);
    let HFC236eaTotal=Number(this.emission1Form.get('HFC236eaTotal').value);
    let HFC245caTotal=Number(this.emission1Form.get('HFC245caTotal').value);
    let HFC365mfcTotal=Number(this.emission1Form.get('HFC365mfcTotal').value);
  let nitrogentrifluorideTotal=Number(this.emission1Form.get('nitrogentrifluorideTotal').value);
  let R401ATotal=Number(this.emission1Form.get('R401ATotal').value);
    let R401BTotal=Number(this.emission1Form.get('R401BTotal').value);
  let R401CTotal=Number(this.emission1Form.get('R401CTotal').value);
  let R402ATotal=Number(this.emission1Form.get('R402ATotal').value);
  let R402BTotal=Number(this.emission1Form.get('R402BTotal').value);
  let R403ATotal=Number(this.emission1Form.get('R403ATotal').value);
  let R403BTotal=Number(this.emission1Form.get('R403BTotal').value);
let R405ATotal=Number(this.emission1Form.get('R405ATotal').value);
  let R407ATotal=Number(this.emission1Form.get('R407ATotal').value);
let R407BTotal=Number(this.emission1Form.get('R407BTotal').value);
let R407DTotal=Number(this.emission1Form.get('R407DTotal').value);
let R407ETotal=Number(this.emission1Form.get('R407ETotal').value);
let R407FTotal=Number(this.emission1Form.get('R407FTotal').value);
let R408ATotal=Number(this.emission1Form.get('R408ATotal').value);
let R410BTotal=Number(this.emission1Form.get('R410BTotal').value);
let R411ATotal=Number(this.emission1Form.get('R411ATotal').value);
let R411BTotal=Number(this.emission1Form.get('R411BTotal').value);
let R412ATotal=Number(this.emission1Form.get('R412ATotal').value);
let R413ATotal=Number(this.emission1Form.get('R413ATotal').value);
let R415ATotal=Number(this.emission1Form.get('R415ATotal').value);
let R415BTotal=Number(this.emission1Form.get('R415BTotal').value);


let R416ATotal =Number(this.emission1Form.get('R416ATotal').value);
let R417ATotal =Number(this.emission1Form.get('R417ATotal').value);
let R417BTotal =Number(this.emission1Form.get('R417BTotal').value);
let R417CTotal =Number(this.emission1Form.get('R417CTotal').value);
let R418ATotal =Number(this.emission1Form.get('R418ATotal').value);
let R419ATotal =Number(this.emission1Form.get('R419ATotal').value);
let R419BTotal =Number(this.emission1Form.get('R419BTotal').value);
let R420ATotal =Number(this.emission1Form.get('R420ATotal').value);
let R421ATotal =Number(this.emission1Form.get('R421ATotal').value);
let R421BTotal =Number(this.emission1Form.get('R421BTotal').value);
let R422ATotal =Number(this.emission1Form.get('R422ATotal').value);
let R422BTotal =Number(this.emission1Form.get('R422BTotal').value);
let R422CTotal =Number(this.emission1Form.get('R422CTotal').value);
let R422DTotal =Number(this.emission1Form.get('R422DTotal').value);
let R422ETotal =Number(this.emission1Form.get('R422ETotal').value);
let R423ATotal =Number(this.emission1Form.get('R423ATotal').value);
let R424ATotal =Number(this.emission1Form.get('R424ATotal').value);
let R425ATotal =Number(this.emission1Form.get('R425ATotal').value);
let R426ATotal =Number(this.emission1Form.get('R426ATotal').value);
let R427ATotal =Number(this.emission1Form.get('R427ATotal').value);
let R428ATotal =Number(this.emission1Form.get('R428ATotal').value);
let R429ATotal =Number(this.emission1Form.get('R429ATotal').value);
let R430ATotal =Number(this.emission1Form.get('R430ATotal').value);
let R431ATotal =Number(this.emission1Form.get('R431ATotal').value);
let R434ATotal =Number(this.emission1Form.get('R434ATotal').value);
let R435ATotal =Number(this.emission1Form.get('R435ATotal').value);
let R437ATotal =Number(this.emission1Form.get('R437ATotal').value);
let R438ATotal =Number(this.emission1Form.get('R438ATotal').value);
let R439ATotal =Number(this.emission1Form.get('R439ATotal').value);
let R440ATotal =Number(this.emission1Form.get('R440ATotal').value);
let R442ATotal =Number(this.emission1Form.get('R442ATotal').value);
let R444ATotal =Number(this.emission1Form.get('R444ATotal').value);
let R445ATotal =Number(this.emission1Form.get('R445ATotal').value);
let R500Total =Number(this.emission1Form.get('R500Total').value);
let R503Total =Number(this.emission1Form.get('R503Total').value);
let R504Total =Number(this.emission1Form.get('R504Total').value);
let R507ATotal =Number(this.emission1Form.get('R507ATotal').value);
let R508ATotal =Number(this.emission1Form.get('R508ATotal').value);
let R508BTotal =Number(this.emission1Form.get('R508BTotal').value);
let R509ATotal =Number(this.emission1Form.get('R509ATotal').value);
let CTotal =Number(this.emission1Form.get('CTotal').value);
let R512ATotal =Number(this.emission1Form.get('R512ATotal').value);
    
    this.totalOfTotals = lpgTotal + naturalGasTotal + aviationSpiritTotal + dieselTotal + fuelOilTotal + lubricantsTotal +
      naphthaTotal + petrolTotal + wasteOilsTotal + anthraciteCoalTotal + petroleumCokeTotal +
      HFC32Total + HFC125Total + HFC134Total + HFC152Total + HFC227Total + HFC236Total + R404ATotal +
      R407CTotal + R410ATotal + othersTotal+ carbonOioxideTotal+nitrousOxideTotal+HFC23Total+
      HFC41Total+HFC134aTotal+HFC143Total+HFC143aTotal+HFC152aTotal+HFC227eaTotal+
      HFC236faTotal+HFC245faTotal+HFC4310meeTotal+perfluoromethanePFC14Total+perfluoroethanePFC116Total+
      perfluoropropanePFC218Total+perfluorocyclobutanePFC318Total+perfluorobutanePFC3110Total+
      perfluoropentanePFC4112Total+perfluorohexanePFC5114Total+pFC9118Total+perfluorocyclopropaneTotal+sulphurhexafluorideSF6Total+
      HFC161Total+HFC236cbTotal+HFC236eaTotal+HFC245caTotal+HFC365mfcTotal+nitrogentrifluorideTotal+
      R401ATotal+R401BTotal+R401CTotal+R402ATotal+R402BTotal+R403ATotal+R403BTotal+R405ATotal+
      R407ATotal+R407BTotal+R407DTotal+R407ETotal+R407FTotal+R408ATotal+R410BTotal+R411ATotal+
      R411BTotal+R412ATotal+R413ATotal+R415ATotal+R415BTotal+R416ATotal+R417ATotal+R417BTotal+R417CTotal+
      R418ATotal+R419ATotal+R419BTotal+R420ATotal+R421ATotal+R421BTotal+R422ATotal+R422BTotal+R422CTotal+
      R422DTotal+R422ETotal+R423ATotal+R424ATotal+R425ATotal+R426ATotal+R427ATotal+R428ATotal+R429ATotal+
      R430ATotal+R431ATotal+R434ATotal+R435ATotal+R437ATotal+R438ATotal+R439ATotal+R440ATotal+R442ATotal+
      R444ATotal+R445ATotal+R500Total+R503Total+R504Total+R507ATotal+R508ATotal+R508BTotal+R509ATotal+CTotal+
      R512ATotal;
    
   this.emission1Form.get('totalOfFirst')?.patchValue(Number(this.totalOfTotals).toFixed(2));
   console.log(this.emission1Form.get('totalOfFirst')?.value);

  }


  calEmissions1(inputVal: any, key: string): void {
    // console.log("OK: ",inputVal);
    let input: number = parseFloat(inputVal);

    let net = this.emission2Form.get(`${key}Net`).value;
    let TJ: number = (parseFloat(net) * input) ? parseFloat(net) * input : 0;
    this.emission2Form.get(`${key}TJ`)?.patchValue(TJ.toFixed(2));
    let tjVal = this.emission2Form.get(`${key}TJ`).value;
    let Co2 = this.emission2Form.get(`${key}CO2Fac`).value;
    // console.log(Co2);
    let total = (parseFloat(Co2) * tjVal) ? parseFloat(Co2) * tjVal : 0;
    // console.log(total,"  :  ",tjVal);
    this.emission2Form.get(`${key}Total`)?.patchValue(TJ.toFixed(2));
  }


  onFocus(data:any,controlVal:string):void{
    let control=this.emission1Form.get(controlVal);
    console.log(data);
     data==0?control.patchValue(''):control.patchValue(Number(data))
  }
  onFocus1(data:any,controlVal:string):void{
    let control=this.emission2Form.get(controlVal);
    console.log(data);
     data==0?control.patchValue(''):control.patchValue(data)

  }

  selectedYear:string='2022';
  selectYear(e:any){
    console.log(e.value);
  //  this.selectedYear=e.target.value.split(' ')[1];
  //  this.patchData(e.target.value.split(' ')[1]);
  this.selectedYear=e.value;
   this.patchData(e.value);
  }
  yearGenerator(): number[] {
  //   const currentYear = new Date().getFullYear();
  // this.years=  Array.from({ length: 3 }, (_, i) => currentYear - (i + 1)).reverse();
  //   return this.years;
  this.years=[[2022,2023,2024]];
  return [2022,2023,2024];
  }

  save():void {
    let submittedData:any=this.data?.detail || {};
      let newData={[this.selectedYear]:{scope1:this.emission1Form.value, scope2:this.emission2Form.value}};
      submittedData={...submittedData,...newData};
      console.log(submittedData);
      this.data['detail']=submittedData;
      console.log(this.data['detail']);
      this.scrollToElement();
      this.animationState = this.animationState === 'default' ? 'active' : 'default';
  }

  submit():void{
    console.log(this.data);
      this.dialogRef.close(this.data['detail']);
  }
  close(){
    this.dialogRef.close(false);
  }
  patchData(year?:string){
    console.log(year);
    this.allSelectedFields=Object.keys(this.data?.detail || {}).map(key => Number(key));
    if(year){
      if(this.data && this.years?.length>0){
        this.patchValueData= this.data?.detail[year]?this.data?.detail[year]:'';
        console.log(this.patchValueData);
        if(this.patchValueData){
          this.emission1Form.patchValue(this.patchValueData?.scope1);
          this.emission2Form.patchValue(this.patchValueData?.scope2);
        }else{
          this.emission1Form.patchValue(Emission1Data);
          this.emission2Form.patchValue(Emission2Data);
        }
    }
    }else{
      if(this.data && this.years?.length>0){
        this.patchValueData= this.data?.detail[this.years[0].toString()]?this.data?.detail[this.years[0].toString()]:'';
        console.log(this.patchValueData);
        if(this.patchValueData){
          this.emission1Form.patchValue(this.patchValueData.scope1);
          this.emission2Form.patchValue(this.patchValueData?.scope2);
        }
    }
    }

}



}






