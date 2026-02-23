import { ComparisonType, ContentType, DisplayMethod, PricingMethod, SelectionType, TaxType, QuestionTypes } from '@unsonet/securepay-types/promotions';
import { PromotionService } from './../../../services/promotion.service';
import { AfterContentInit, AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { Promotion, RecurrencePeriod } from '@unsonet/securepay-types/promotions';
// import bootstrap from 'bootstrap';
import { filterArray } from '../../../../shared/utils';
import { getDates, getEnumValues, getUrlParameter, isPromise, moveArrayItem, getRandomString, sleep, sortArrayOfObjects, stripHTML, uniqueArr, findMod, toLowerCase } from '@unsonet/utils';
import { addFormGroupControl, addToFormArray, checkboxFormArrayHandler, checkboxFormControlHandler, cloneAbstractControl, compareByID, filterControls, getFormControlName, getRawValueDeep, manageFormControl, manageFormControls, removeFormArrayControl, removeFormGroupControl, removeFromFormArray, renameFormControl, replaceFormControl, switchFormArray } from '@unsonet/ngx-utils';
import moment from 'moment';
import { PreviewComponent } from '@unsonet/securepay-preview';
import { DayOfWeek } from '@unsonet/securepay-types';
import { ArrayValidators, CommonValidators, DateValidators, ObjectValidators, PhoneValidators, RegExpValidators } from '@unsonet/ngx-validators';
//import * as $ from 'jquery';
import jq from '@unsonet/jquery-importer';
var $: JQueryStatic = (jq as any).default || (globalThis as any).$;
//declare var $: any;

import "jquery-ui/ui/widget.js";
import "jquery-ui/ui/data.js";
import "jquery-ui/ui/scroll-parent.js";
import "jquery-ui/ui/widgets/mouse.js";
import "jquery-ui/ui/widgets/sortable.js";

// declare global {
//   interface JQuery {
//     (selector: string): JQuery;
//     selectpicker(options?: any): any;
//   }
// }

@Component({
  selector: 'app-new-promotion-page',
  templateUrl: './new-promotion-page.component.html',
  styleUrls: ['./new-promotion-page.component.scss'],
  host: { "class": "bs-3" },
  standalone: false,
})
export class NewPromotionPageComponent implements OnInit, AfterContentInit, AfterViewInit {

  @ViewChild('el', { read: ElementRef }) el;


  $ = $;
  stripHTML = stripHTML;
  uniqueArr = uniqueArr;
  compareByID = compareByID;

  getRawValueDeep = getRawValueDeep;
  addToFormArray = addToFormArray;
  removeFromFormArray = removeFromFormArray;
  removeFormArrayControl = removeFormArrayControl;
  removeFormGroupControl = removeFormGroupControl;
  addFormGroupControl = addFormGroupControl;
  checkboxFormArrayHandler = checkboxFormArrayHandler;
  checkboxFormControlHandler = checkboxFormControlHandler;
  manageFormControls = manageFormControls;
  manageFormControl = manageFormControl;
  renameFormControl = renameFormControl;
  replaceFormControl = replaceFormControl;
  filterControls = filterControls;
  filterArray = filterArray;


  console = window.console;
  Object = window.Object;
  JSON = window.JSON;
  //data
  initialisationData;
  defaultPromotionData;
  bufferPromotionData;

  //collections
  templateDepartments: Array<any>;
  bccDepartments: Array<any>;

  public QuestionTypes;

  //formControls
  promotionDataGroup: FormGroup;
  BCC: FormControl = new FormControl('-1');
  toggleNotifyEmails = new FormControl(false);

  promotionReady = false;

  abstractControlOrders = [];
  previewTemplate = '';
  templateId = '';

  //tabs
  activeTab = 'tab-information';
  activeCategoryTab = 0;
  @ViewChild('categoryTabPanel', { static: false }) categoryTabPanel: ElementRef;
  @ViewChild('additionalBccEmails', { static: false }) additionalBccEmails: ElementRef;
  //sortable
  sortableOptions = {
    animation: 150,
    handle: ".drag",
    direction: 'vertical',
    ghostClass: 'collapsed',
    chosenClass: 'collapsed',
    onEnd: (evt) => {
      let collapsedClass = 'collapsed';
      if (JSON.parse(this.categoryTabPanel.nativeElement.children[this.activeCategoryTab]?.dataset.collapse || false) && !evt.item.classList.contains(collapsedClass)) {
        evt.item.classList.add(collapsedClass);
      }
    }
  };

  //summernote
  promotionTextNavigation = [
    ['style', ['bold', 'italic', 'underline']],
    ['fontname', ['fontname']],
    ['fontsize', ['fontsize']],
    ['color', ['forecolor']],
    ['para', ['paragraph']],
    ['para', ['ul', 'ol']],
    ['table', ['table']],
    ['insert', ['link', 'picture']],
    ['cleaner', ['cleaner']]
  ];

  footerTextNavigation = [
    ['style', ['bold', 'italic', 'underline']],
    ['fontsize', ['fontsize']],
    ['color', ['forecolor']],
    ['para', ['paragraph']],
    ['para', ['ul', 'ol']],
    ['table', ['table']],
    ['insert', ['link', 'picture']],
    ['cleaner', ['cleaner']]
  ];

  init = false;

  //airdatepicker
  datePattern = 'YYYY-MM-DD';
  customDatepickerOptions = (() => {
    let _this = this;
    return {
      //onSelect: datepickerSelectHandler,
      onRenderCell: function (...args) {
        return _this.datepickerRenderCellHandler.call(_this, ...args)
      }
    }

  })();
  specificDatesDPOptions = (() => {
    let _this = this;
    return {
      //onSelect: datepickerSelectHandler,
      onRenderCell: function (...args) {
        return _this.specificDatesDPRenderCellHandler.call(_this, ...args)
      }
    }

  })();

  customAdditionalBccEmail = {};

  constructor(
    public formBuilder: FormBuilder,
    public promotionService: PromotionService,
    private cdr: ChangeDetectorRef,
    @Inject('rrule') private rrule: any,
  ) {
  }

  async ngAfterViewInit() {

    if (!this.init) {
      this.init = !this.init;

      this.initApiEndpoints();

      window.addEventListener("message", async (event) => {
        switch (event.data.action) {
          case "promotion-set": {
            let { initialisationData, promotionData } = event.data;
            await this.initNewPromotionPage(initialisationData, promotionData);
          }
        }
      });

      if (window.parent) {
        let promootionInitEvent = new Event("promotion-init", { bubbles: true });
        document.dispatchEvent(promootionInitEvent);
        window.parent.postMessage({ "action": "promotion-init" }, "*");
      }

      let isIframe = getUrlParameter(location.href, "iframe", true)?.toLowerCase()?.trim() == 'true';
      //if (!isIframe) {
      this.initNewPromotionPage();
      //}

    }

    //this.cdr.detectChanges();

    let initScrollInterval = setInterval(() => {
      if (document.querySelector('#promotionDisplay')) {
        this.initStickyScroll();

        clearInterval(initScrollInterval)
      }
    }, 100)

  }

  ngAfterContentInit(): void {

  }
  ngAfterContentChecked() {
    this.cdr.detectChanges();
  }


  async ngOnInit() {

  }

  initApiEndpoints() {
    let apiEndpoints;
    let hasDefaultQueryParam = (getUrlParameter(location.href, "default", true) || '').toLowerCase() == 'true';

    if (hasDefaultQueryParam) {
      apiEndpoints = {
        baseApiHost: `test.securepay.ae`,
        promotionDataUrl: `/ajax/promotions/getPromotion?promotionUuid={{promotionId}}`,
        hotelDataUrl: `/admin/ajax/promotions/getPromotionAddEditFormInitialisation`,
        submitPromotionUrl: `/admin/promotions/submitPromotion`,
      };
      (window as any)['SecurePayApiEndpoints'] = apiEndpoints;
    } else {
      apiEndpoints = (window as any)['SecurePayApiEndpoints'];
    }
    this.promotionService.setApiEndpoints(apiEndpoints);
  }

  initNewPromotionPage(initialisationData?, promotionData?) {
    return new Promise(async (resolve, reject) => {
      let delay = getUrlParameter(location.href, "delay", true);
      if (delay) {
        await sleep(+delay || 0);
      }

      if (isPromise(initialisationData)) {
        let res = await initialisationData;
        initialisationData = res.json();
      }

      if (isPromise(promotionData)) {
        let res = await promotionData;
        promotionData = res.json();
      }

      //data
      this.initialisationData = this.promotionService.initialisationData = initialisationData ? JSON.parse(JSON.stringify(initialisationData)) : await this.promotionService.getInitialisationData();
      this.defaultPromotionData = PreviewComponent.getDefaultPromotionData(promotionData ? JSON.parse(JSON.stringify(promotionData)) : await this.promotionService.getPromotionData(getUrlParameter(location.href, "PromotionId", true) || undefined));
      this.bufferPromotionData = Object.assign({}, this.defaultPromotionData);

      this.bccDepartments = this.initialisationData.promotionAddEditFormInitialisationData.bccDepartments.map(item => ({ id: item.id, name: item.name, users: item.users }));
      this.templateDepartments = this.initialisationData.promotionAddEditFormInitialisationData.templateDepartments.map(item => ({ id: item.id, name: item.name, templates: item.templates }));

      this.QuestionTypes = QuestionTypes;

      // this.promotionDataGroup = new FormGroup({
      //   name: new FormControl('', [Validators.required]),
      // });

      this.initTabs('general-tabs');

      //bugfix
      // this.promotionDataGroup = this.formBuilder.group({
      //     categories:this.formBuilder.array([])
      //   });
      console.log('this.defaultPromotionData', this.defaultPromotionData, this.initialisationData, this.promotionDataGroup);
      this.promotionDataGroup = this.getPromotionGroup(this.defaultPromotionData);
      this.promotionDataGroupSubscribe();

      //previewTemplate
      let displayTemplateHandler = (templateId => {
        this.previewTemplate = this.promotionService.getPreviewTemplate(templateId);
        this.templateId = templateId;
      }).bind(this);
      displayTemplateHandler(this.promotionDataGroup?.controls?.displayTemplate.value.id);
      this.promotionDataGroup?.controls?.displayTemplate.valueChanges.subscribe(displayTemplateHandler);


      this.toggleNotifyEmails.valueChanges.subscribe((val) => {
        let notifyEmailsFormArray = (this.promotionDataGroup?.controls?.notifyEmails as FormArray);
        let additionalEmail = this.additionalBccEmails?.nativeElement?.value || '';
        if (val) {
          notifyEmailsFormArray.clear();
          let departmentUsers = this.promotionService.getDepartmentUsers(+this.BCC.value);
          departmentUsers.forEach(item => {
            if (item?.emailAddress) {
              notifyEmailsFormArray.push(new FormControl());
            }
          })
          notifyEmailsFormArray.setValue(departmentUsers.reduce((prev, cur) => cur?.emailAddress ? [...prev, cur.emailAddress] : prev, []))
          if (additionalEmail) this.addToFormArray(notifyEmailsFormArray, additionalEmail);
        } else {
          notifyEmailsFormArray.clear();
          if (additionalEmail) this.addToFormArray(notifyEmailsFormArray, additionalEmail);
        }
      });

      //SET DEFAULT VALUE
      this.toggleNotifyEmails.setValue(true);

      of(this.defaultPromotionData).subscribe((defaultData: Promotion) => {//this.promotionService.getDefaultPromotionData()
        //this.promotionDataGroup.reset();
        this.promotionDataGroup = this.getPromotionGroup(defaultData);
        //this.updateFormGroup(this.promotionDataGroup, defaultData)
        this.promotionDataGroupSubscribe();

        /*notifyEmails*/
        // let emailDepartments = [];
        // (this.promotionDataGroup?.controls?.notifyEmails as FormArray)?.controls.forEach(notifyEmailControl=>{
        //   emailDepartments.push(this.promotionService.getEmailDepartmentID(notifyEmailControl.value));
        // })
        // let emailDepartmentsUnique = this.Object.keys(getCountsSorted(emailDepartments));
        // if(emailDepartmentsUnique.length){
        //   this.BCC.setValue(emailDepartmentsUnique[0]);
        // }
        (() => {
          let departmentId = -1;
          let notifyEmailsFormArray = (this.promotionDataGroup?.controls?.notifyEmails as FormArray);
          let notifyEmails = notifyEmailsFormArray.value;
          let matchDepartments = this.bccDepartments.filter(department => {
            return department.users.some(item => notifyEmails.includes(item.emailAddress));
          });

          let customDepartment = { id: -2, name: 'Custom', users: [] };
          this.bccDepartments.unshift(customDepartment);

          if (matchDepartments?.length) {
            departmentId = sortArrayOfObjects(matchDepartments, [{ field: 'name' }])?.[0].id;
          } else {
            if (!this.bccDepartments.find(item => item.id == customDepartment.id) || !this.bccDepartments.length) {
              departmentId = customDepartment.id;
            }
          }
          this.BCC.setValue(departmentId);
          this.customAdditionalBccEmail[departmentId] = this.promotionService.getAdditionDepartmentEmails(this.promotionDataGroup.controls?.notifyEmails?.value, departmentId)[0] || '';
        })();
        /*end notifyEmails*/

        this.BCC.valueChanges.subscribe((val) => {
          (this.promotionDataGroup?.controls?.notifyEmails as FormArray).clear()
          this.promotionDataGroup?.controls?.notifyEmails.setValue([])
          this.toggleNotifyEmails.setValue(true);
          this.additionalBccEmailsChangeHandler();
        });

        //dispatch valueChangedEvent to set handlers
        this.promotionDataGroup.enable({ emitEvent: true });

        this.bufferPromotionData.categories.forEach((category, categoryIndex) => {
          category.questions.forEach((question, questionIndex) => {
            this.checkQuestionValidators(categoryIndex, questionIndex);
          })
        });

        if (!this.promotionReady) {
          this.promotionReady = true;
          let promootionReadyEvent = new Event("promotion-ready", { bubbles: true });
          document.dispatchEvent(promootionReadyEvent);
          window.parent.postMessage({ "action": "promotion-ready" }, "*");
        }


      });



      resolve(true);
    });
  }

  promotionDataGroupSubscribe() {

    /*init old functions*/

    setTimeout(() => {
      this.setSelectMenuHandler(this.el.nativeElement.querySelectorAll("#newPromotionForm .form-group > select"), '.radio-menu .radio-menu-container');
      this.setSelectMenuHandler([...this.el.nativeElement.querySelectorAll('input[type=radio], input[type=radio][name], input[type=radio][ng-reflect-name]') as any], '.radio-menu-container');
      //this.initTabs('categories-tabs');
    }, 1);

    this.promotionDataGroup.valueChanges.subscribe((data) => {
      this.bufferPromotionData = data;//this.getRawValueDeep(this.promotionDataGroup);
      console.log('DATA', this.promotionDataGroup, this.bufferPromotionData);
      console.log("VALID", this.promotionDataGroup);
    });

    this.promotionDataGroup.statusChanges.subscribe((status) => {
      console.log('status', status)
    });

    this.promotionDataGroup.get('categories').valueChanges.subscribe((data) => {

      if (data.length > this.bufferPromotionData.categories.length) {
        let lastCategoryIndex = data.length - 1;
        let categoryTab = this.categoryTabPanel.nativeElement.children[lastCategoryIndex];
        setTimeout(() => {
          if (categoryTab) {
            this.setSelectMenuHandler(categoryTab.querySelectorAll("#newPromotionForm .form-group > select"), '.radio-menu .radio-menu-container');
            this.setSelectMenuHandler([...categoryTab.querySelectorAll('input[type=radio], input[type=radio][name], input[type=radio][ng-reflect-name]') as any], '.radio-menu-container');
            //this.initTabs('categories-tabs');
            //this.checkCategoryValidators(lastCategoryIndex);
          }
        }, 1);
      }

      data.forEach((category, i) => {
        if (category.questions.length > (this.bufferPromotionData.categories?.[i]?.questions.length || 0)) {
          let lastQuestionIndex = category.questions.length - 1;
          setTimeout(() => {
            let sortableBlock = this.categoryTabPanel.nativeElement.children[i].querySelectorAll('[formarrayname=questions]')[lastQuestionIndex];
            if (sortableBlock) {
              this.setSelectMenuHandler(sortableBlock.querySelectorAll("#newPromotionForm .form-group > select"), '.radio-menu .radio-menu-container');
              this.setSelectMenuHandler([...sortableBlock.querySelectorAll('input[type=radio], input[type=radio][name], input[type=radio][ng-reflect-name]') as any], '.radio-menu-container');
              this.checkQuestionValidators(i, lastQuestionIndex);
            }
          }, 1);
        }
      });

    });

    this.checkGeneralValidators();

  }

  checkGeneralValidators() {
    this.promotionDataGroup.get('hasTaxes').valueChanges.subscribe(val => {

      // this.promotionDataGroup.get('taxes')['controls'].forEach(control => {
      //   let taxNameControl = control.get('tax').get('name');
      //   if (val == true) {
      //     this.addValidators(taxNameControl, Validators.required);
      //   } else {
      //     this.removeValidators(taxNameControl);
      //   }
      // });
      if (val == true) {
        this.promotionDataGroup.get('taxes').enable();
      } else {
        this.promotionDataGroup.get('taxes').disable();
      }

    });

    this.promotionDataGroup.get('promotionDate').valueChanges.subscribe(val => {
      //let lastDateControl = this.promotionDataGroup.get('promotionDates').get('recurringDates').get('lastDate');

      if (val == 'specific') {
        // this.promotionDataGroup.get('promotionDates').get('staticDates').get('dates')['controls'].forEach(control => {
        //   this.addValidators(control, Validators.required);
        // });
        this.promotionDataGroup.get('promotionDates').get('staticDates').enable();
      } else {
        // this.promotionDataGroup.get('promotionDates').get('staticDates').get('dates')['controls'].forEach(control => {
        //   this.removeValidators(control);
        // });
        this.promotionDataGroup.get('promotionDates').get('staticDates').disable();
      }

      if (val == 'recurring') {
        //this.addValidators(this.promotionDataGroup.get('promotionDates').get('recurringDates').get('firstDates')['controls'][0], Validators.required);
        this.promotionDataGroup.get('promotionDates').get('recurringDates').enable();
      } else {
        //this.removeValidators(this.promotionDataGroup.get('promotionDates').get('recurringDates').get('firstDates')['controls'][0]);
        this.promotionDataGroup.get('promotionDates').get('recurringDates').disable();
      }

      this.updatePossibleDates();
    });

    this.promotionDataGroup.get('promotionDates').valueChanges.subscribe(val => {
      this.updatePossibleDates();
    })

    this.promotionDataGroup.get('endRecurrence').valueChanges.subscribe(val => {
      let lastDateControl = this.promotionDataGroup.get('promotionDates').get('recurringDates').get('lastDate');
      if (val == 'limited' && this.promotionDataGroup.get('promotionDate').value == 'recurring') {
        //this.addValidators(lastDateControl, Validators.required);
        lastDateControl.enable();
      } else {
        //this.removeValidators(lastDateControl);
        lastDateControl.disable();
      }
    });

    this.promotionDataGroup.get('maxAttendees').valueChanges.subscribe(val => {
      if (val == 'limited') {
        //this.addValidators(this.promotionDataGroup.get('maxAttendeesPerDate'), [Validators.required, Validators.min(1)]);
        this.promotionDataGroup.get('maxAttendeesPerDate').enable();
      } else {
        //this.removeValidators(this.promotionDataGroup.get('maxAttendeesPerDate'));
        this.promotionDataGroup.get('maxAttendeesPerDate').disable();
      }
    })

    this.promotionDataGroup.get('publish').valueChanges.subscribe(val => {
      if (val == 'range') {
        this.addValidators(this.promotionDataGroup.get('activeDateRange').get('minimum'), [Validators.required]);
        this.addValidators(this.promotionDataGroup.get('activeDateRange').get('maximum'), [Validators.required]);
        this.promotionDataGroup.get('activeDateRange').enable({ emitEvent: false });
      }
      if (val == 'always') {
        this.removeValidators(this.promotionDataGroup.get('activeDateRange').get('minimum'));
        this.removeValidators(this.promotionDataGroup.get('activeDateRange').get('maximum'));
        this.promotionDataGroup.get('activeDateRange').disable({ emitEvent: false });
      }
    })
  }

  //checkCategoryValidators(categoryIndex) {}

  checkQuestionValidators(categoryIndex, questionIndex) {
    let categoryControl = this.promotionDataGroup.get('categories')['controls'][categoryIndex];
    let questionControl = categoryControl.get('questions')['controls'][questionIndex];
    let type = Object.keys(questionControl.controls)[0];

    let handleType = (newType) => {

      let qustionTypeControl = questionControl.get(newType);

      if (!newType) return;
      setTimeout(() => {
        this.setSelectMenuHandler([...this.categoryTabPanel.nativeElement.children[categoryIndex].querySelectorAll('[formarrayname=questions]')[questionIndex].querySelectorAll('input[type=radio][name], input[type=radio][ng-reflect-name]') as any], '.radio-menu-container', false);
      }, 1);

      if (newType == this.QuestionTypes[0]) {
        qustionTypeControl.get('options').enable({ emitEvent: false });
      } else {
        qustionTypeControl.get('options').disable({ emitEvent: false });
      }

      if ([this.QuestionTypes[0], this.QuestionTypes[1]].includes(newType)) {
        qustionTypeControl.get('buyMultiple')?.enable({ emitEvent: false });
      } else {
        qustionTypeControl.get('buyMultiple')?.disable({ emitEvent: false });
      }


      if ([this.QuestionTypes[0], this.QuestionTypes[1]].includes(newType) && qustionTypeControl.get('addTaxes').value == true) {
        qustionTypeControl.get('taxes').enable({ emitEvent: false });
      } else {
        qustionTypeControl.get('taxes').disable({ emitEvent: false });
      }

      if (newType == this.QuestionTypes[1]) {
        if (qustionTypeControl.get('dates').value == 'specific') {
          qustionTypeControl.get('possibleDates')?.get('staticDatesWithPricing')?.get('dates')?.enable({ emitEvent: false });
          qustionTypeControl.get('possibleDates')?.get('recurringDates')?.disable({ emitEvent: false });
        } else {
          if (this.promotionDataGroup.get('promotionDate').value == "specific") {
            qustionTypeControl.get('possibleDates')?.get('recurringDates')?.disable({ emitEvent: false });
          } else {
            qustionTypeControl.get('possibleDates')?.get('staticDatesWithPricing')?.get('dates')?.disable({ emitEvent: false });
          }
        }
      } else {
        qustionTypeControl.get('possibleDates')?.get('staticDatesWithPricing')?.get('dates')?.disable({ emitEvent: false });
        qustionTypeControl.get('possibleDates')?.get('recurringDates')?.disable({ emitEvent: false });
      }

      if (newType == this.QuestionTypes[2]) {

      } else {

      }

      if (newType == this.QuestionTypes[3]) {

      } else {

      }

      //////////

    }

    handleType(type);

    questionControl.valueChanges.subscribe(data => {
      let newType = Object.keys(data)[0];
      handleType(newType);
    });
  }

  public addValidators(control, validators) {
    let existingValidators = control.validator;
    control.setValidators(Validators.compose([existingValidators, validators].flat(1)));
    this.updateValidators(control, { onlySelf: true, emitEvent: true });
  }

  public removeValidators(control) {
    control.clearValidators();
    this.updateValidators(control, { onlySelf: true, emitEvent: true });
  }

  public updateValidators(control, options?) {
    control.updateValueAndValidity(options);
  }


  getPromotionGroup(data) {

    return this.formBuilder.group(
      {
        [data?.id ? 'id' : 'tempId']: [data?.id ? data?.id : data?.tempId || getRandomString(32)],
        name: [data?.name || '', [Validators.required, Validators.minLength(3)]],
        hotel: this.formBuilder.group({
          [data?.hotel?.id ? 'id' : 'tempId']: [data?.hotel?.id ? data?.hotel?.id : data?.hotel?.tempId || getRandomString(32)],
          name: [data?.hotel?.name || ''],
          currency: [data?.hotel?.currency || ''],
          currencyFormat: [data?.hotel?.currencyFormat || ''],
        }),
        department: [{
          id: this.promotionService.containsDepartmentId(this.templateDepartments, data?.department?.id) ? data?.department?.id : this.templateDepartments[0]?.id
        }],
        displayTemplate: [this.promotionService.hasDepartmentTemplate(data?.department?.id, data?.displayTemplate?.id) ? {
          id: data?.displayTemplate?.id || '',
          name: data?.displayTemplate?.name || '',
          description: data?.displayTemplate?.description || '',
        } : {
          id: this.promotionService.getDepartmentTemplates(this.templateDepartments[0]?.id)?.[0]?.id || '',
          name: this.promotionService.getDepartmentTemplates(this.templateDepartments[0]?.id)?.[0]?.name || '',
          description: this.promotionService.getDepartmentTemplates(this.templateDepartments[0]?.id)?.[0]?.description || '',
        }],
        taxes: this.formBuilder.array(this.buildArrayControl({ path: 'taxes', formArray: this.promotionDataGroup?.controls?.taxes, data: data.taxes || [] })),
        // multiplePurchasesAllowed: this.formBuilder.group({
        //   maximum: [],
        //   minimum: []
        // }),
        promotionDates: this.formBuilder.group(
          (() => {
            // if (data?.promotionDates?.staticDates) {
            //   return {
            //     staticDates: this.formBuilder.group({
            //     dates: this.formBuilder.array(this.buildArrayControl({path:'promotionDates.staticDates.dates', formArray:((this.promotionDataGroup?.controls?.promotionDates as FormGroup )?.controls?.staticDates as FormGroup )?.controls?.dates, data:data?.promotionDates?.staticDates?.dates || []}))
            //     })
            //   }
            // } else if (data?.promotionDates?.recurringDates) {
            //   return {
            //     recurringDates: this.formBuilder.group({
            //       firstDates: this.formBuilder.array(data?.promotionDates?.recurringDates?.firstDates),
            //       lastDate: [data?.promotionDates?.recurringDates?.lastDate],
            //       recurrencePeriod: [data?.promotionDates?.recurringDates?.recurrencePeriod as RecurrencePeriod],
            //       recurrenceInterval: [1]
            //     })
            //   }
            // }else{
            //   return this.formBuilder.group({})
            // }

            return {
              staticDates: this.formBuilder.group({
                dates: this.formBuilder.array(this.buildArrayControl({ path: 'promotionDates.staticDates.dates', formArray: ((this.promotionDataGroup?.controls?.promotionDates as FormGroup)?.controls?.staticDates as FormGroup)?.controls?.dates, data: data?.promotionDates?.staticDates?.dates || [""] }))
              }),
              recurringDates: this.formBuilder.group({
                firstDates: this.formBuilder.array([new FormControl(data?.promotionDates?.recurringDates?.firstDates[0] || '', [Validators.required, DateValidators.isDate("YYYY-MM-DD")])]),
                lastDate: [data?.promotionDates?.recurringDates?.lastDate || '', [Validators.required, DateValidators.isDate("YYYY-MM-DD")]],
                recurrencePeriod: [data?.promotionDates?.recurringDates?.recurrencePeriod as RecurrencePeriod || RecurrencePeriod[0]],
                recurrenceInterval: [data?.promotionDates?.recurringDates?.recurrenceInterval || 1],
                enabledDays: this.formBuilder.array(
                  //this.buildArrayControl({path:'promotionDates.recurringDates.enabledDays',formArray:((this.promotionDataGroup?.controls?.promotionDates as FormGroup)?.controls?.recurringDates as FormGroup)?.controls?.enabledDays, data:data?.promotionDates?.recurringDates?.enabledDays})
                  this.sortEnabledDays(data?.promotionDates?.recurringDates?.enabledDays || getEnumValues(DayOfWeek)).map(item => new FormControl(item)),
                  [ArrayValidators.minElements(1)]
                )
              })
            }

          })()
        ),
        maxAttendeesPerDate: [data?.maxAttendeesPerDate, [Validators.required, Validators.min(1)]],
        promotionText: [data?.promotionText || '', [Validators.required]],
        contactName: [data?.contactName || '', [Validators.required]],
        contactEmail: [data?.contactEmail || '', [Validators.required, Validators.email]],
        contactPhone: [data?.contactPhone || '', [Validators.required, PhoneValidators.validPhoneNumber]],
        notifyEmails: this.formBuilder.array(this.buildArrayControl({ path: 'notifyEmails', formArray: this.promotionDataGroup?.controls?.notifyEmails, data: data.notifyEmails || [] })),
        footerText: [data?.footerText],
        activeDateRange: this.formBuilder.group({
          minimum: [data?.activeDateRange?.minimum || '', [Validators.required, DateValidators.isDate("YYYY-MM-DD HH:mm")]],
          maximum: [data?.activeDateRange?.maximum || '', [Validators.required, DateValidators.isDate("YYYY-MM-DD HH:mm")]]
        }),
        customCSS: [data?.customCSS || ''],
        customJS: [data?.customJS || ''],
        blockedDates: this.formBuilder.group(
          Object.keys(data?.blockedDates || {}).reduce((prev, cur) => {
            prev[cur] = [data?.blockedDates?.[cur] || "", [ObjectValidators.hasKeyValue]];
            return prev;
          }, {})
        ),
        categories: this.formBuilder.array(this.buildArrayControl({ path: 'categories', formArray: this.promotionDataGroup?.controls?.categories, data: data.categories || [] })),
        // categories: this.formBuilder.group({
        //   id: [],
        //   name: [],
        //   description: [],
        //   showHeadings: [],
        //   questions: this.formBuilder.array([{

        //     dateQuestion: this.formBuilder.group({
        //       id: [],
        //       title: [],
        //       description: [],
        //       showHeadings: [],
        //       displayNever: [],
        //       mandatory: [],
        //       basePrices: this.formBuilder.group({
        //         sunday: 100,
        //         monday: 50,
        //         tuesday: 50,
        //         wednesday: 50,
        //         thursday: 50,
        //         friday: 50,
        //         saturday: 100
        //       }),
        //       pricingMethod: perDay,
        //       possibleDates: this.formBuilder.group({
        //         staticDatesWithPricing: this.formBuilder.group({
        //           dates: this.formBuilder.group({
        //             2020-11 - 25: 10,
        //             2020-11 - 26: 0
        //         }),
        //           tempId: []
        //         })
        //       }),
        //       taxes: [
        //         {
        //           id: 3920,
        //           tax: this.formBuilder.group({
        //             id: 3921,
        //             name: Set Fee 1,
        //             taxType: fixed
        //           }),
        //           amount: 20.0000
        //         },
        //       ],
        //       selectMultiple: this.formBuilder.group({
        //         minimum: 1,
        //         maximum: 4
        //       }),
        //       selectMultipleType: arbitraryDates,
        //       buyMultiple: this.formBuilder.group({
        //         minimum: 1,
        //         maximum: 10
        //       })
        //     })

        //   }])
        // })

        uuid: [data?.uuid || ''],
        promotionLink: [data?.promotionLink || ''],
        enabled: [data?.enabled ? true : false],
        createdBy: [{
          id: data?.createdBy?.id || '',
          username: data?.createdBy?.firstName || '',
          firstName: data?.createdBy?.firstName || '',
          lastName: data?.createdBy?.lastName || ''
        }],

        //interface
        hasTaxes: [data?.taxes?.length && data?.taxes.some(tax => tax.tax.name) ? true : false],
        promotionDate: [data?.promotionDates?.staticDates ? 'specific' : data?.promotionDates?.recurringDates ? 'recurring' : 'noDate'],
        endRecurrence: [data?.promotionDates?.recurringDates ? data?.promotionDates?.recurringDates?.lastDate ? 'limited' : 'unlimited' : 'limited'],
        maxAttendees: [data?.maxAttendeesPerDate ? 'limited' : 'unlimited'],
        publish: [data?.activeDateRange ? 'range' : 'always'],

      }
    )

  }


  // myValidator(formControl: FormControl) {
  //   if (true) {
  //     return null;
  //   } else {
  //     return { error: "Error" }
  //   }
  // }
  // myAsyncValidator(formControl: FormControl) {
  //   if (true) {
  //     return of(null);
  //   } else {
  //     return of({ error: "Error" })
  //   }
  // }

  addFormArrayControl(formArray, index?) {
    if (index != undefined) {
      (formArray as FormArray).insert(index, this.buildArrayControl({ formArray })[0]);
    } else {
      (formArray as FormArray).push(this.buildArrayControl({ formArray })[0])
    }
  }

  buildArrayControl(options: { formArray, data?: any[] | null, path?: string }): AbstractControl[] {
    let { formArray = null, data, path } = options || {}
    this.console.log('formArray', formArray);
    var formBuilder = this.formBuilder;
    let pathParts = path ? path.split('.') : [];
    let formControlName = pathParts.length ? pathParts[pathParts.length - 1] : getFormControlName(formArray);
    let formControlParentName = pathParts.length ? pathParts[pathParts.length - 2] || null : formArray?.parent ? getFormControlName(formArray?.parent) : null;

    switch (true) {
      case ((formArray === ((this.promotionDataGroup?.controls?.promotionDates as FormGroup)?.controls?.staticDates as FormGroup)?.controls?.dates) || (formControlParentName == "dates")): {
        this.console.log('WTF', ((formArray === ((this.promotionDataGroup?.controls?.promotionDates as FormGroup)?.controls?.staticDates as FormGroup)?.controls?.dates) || (formControlParentName == "dates")))
        return data ?
          data.map(x => {
            return new FormControl(x, [Validators.required, DateValidators.isDate(this.datePattern)]);
          })
          :
          [new FormControl('', [Validators.required, DateValidators.isDate(this.datePattern)])];
      }
      case ((formArray === this.promotionDataGroup?.controls?.notifyEmails) || (formControlName == "notifyEmails")): {
        return data ?
          data.map(x => {
            return new FormControl(x);
          })
          :
          [new FormControl('')];
      }
      case ((formArray === this.promotionDataGroup?.controls?.categories) || (formControlName == "categories")): {
        return data ?
          data.map(x => {
            return formBuilder.group({
              [x?.id ? 'id' : 'tempId']: [x?.id ? x?.id : x?.tempId || getRandomString(32)],
              name: [x?.name || '', [Validators.required]],
              description: [x?.description || ''],
              showHeadings: [x?.showHeadings != undefined ? x.showHeadings : true],
              questions: formBuilder.array(this.getQuestionFormArray(x?.questions || []))
            })
          })
          :
          [formBuilder.group({
            tempId: [getRandomString(32)],
            name: ['', [Validators.required]],
            description: [''],
            showHeadings: [true],
            questions: formBuilder.array(this.getQuestionFormArray([]))
          })
          ]

      } case (formControlName == 'options'): {
        return (this.getQuestionFormGroup({}, this.QuestionTypes[0]) as any).options.controls;
      }
      case (formControlName == 'taxes'): {
        return data ?
          data.map(x => {
            return formBuilder.group({
              [x?.id ? 'id' : 'tempId']: [x?.id ? x?.id : x?.tempId || getRandomString(32)],
              tax: formBuilder.group({
                [x?.tax?.id ? 'id' : 'tempId']: [x?.tax?.id ? x?.tax?.id : x?.tax?.tempId || getRandomString(32)],
                name: [x?.tax?.name || '', [Validators.required]],
                taxType: [x?.tax?.taxType || TaxType[0]]
              }),
              amount: [x?.amount != undefined ? x.amount : 0]
            })
          })
          :
          [formBuilder.group({
            tempId: [getRandomString(32)],
            tax: formBuilder.group({
              tempId: [getRandomString(32)],
              name: ['', [Validators.required]],
              taxType: [TaxType[0]]
            }),
            amount: [0]
          })
          ]
      }
      case (formControlName == 'questions'): {

        let questionFormGroup = formBuilder.group({
          [this.QuestionTypes[0]]: formBuilder.group((this.getQuestionFormGroup({}, this.QuestionTypes[0]) as any))
        });

        return [
          questionFormGroup
        ];
      }
      default: {
        return [];
      }
    }
  }

  getQuestionFormArray(questionArray: any[]) {
    let QuestionTypes = this.QuestionTypes;
    let formBuilder = this.formBuilder;

    return questionArray.length ?
      questionArray.map(x => {
        let questionType = Object.keys(x)[0] || QuestionTypes[0];

        let questionFormGroup = formBuilder.group({
          [questionType]: formBuilder.group(this.getQuestionFormGroup(x[questionType], questionType, true))
        });
        this.initQuestionInterfaceSubscriptions(questionFormGroup);
        return questionFormGroup;
      })
      :
      (() => {
        let questionFormGroup = formBuilder.group({
          [QuestionTypes[0]]: formBuilder.group(this.getQuestionFormGroup({}, QuestionTypes[0]))
        });
        this.initQuestionInterfaceSubscriptions(questionFormGroup);
        return [questionFormGroup];
      })();
  }

  getPossibleDatesFormGroup(data) {
    let formBuilder = this.formBuilder;

    //RecurringDates
    //StaticDates
    //StaticDatesWithPricing

    if (data?.recurringDates) {
      let promotionDates = (this.promotionDataGroup.controls.promotionDates as FormGroup);
      if (promotionDates?.controls?.recurringDates) {
        return formBuilder.group({ recurringDates: cloneAbstractControl(promotionDates?.controls?.recurringDates) });
      } else {
        return formBuilder.group({
          recurringDates: formBuilder.group({
            [data?.recurringDates?.id ? 'id' : 'tempId']: [data?.recurringDates?.id ? data?.recurringDates?.id : data?.recurringDates?.tempId || getRandomString(32)],
            firstDates: formBuilder.array([data.recurringDates.firstDates]),
            lastDate: [data.recurringDates.lastDate],
            recurrencePeriod: [data.recurringDates.recurrencePeriod || RecurrencePeriod[0]],
            recurrenceInterval: [data.recurringDates.recurrenceInterval || 1],
            enabledDays: this.formBuilder.array(
              //this.buildArrayControl({path:'promotionDates.recurringDates.enabledDays',formArray:((this.promotionDataGroup?.controls?.promotionDates as FormGroup)?.controls?.recurringDates as FormGroup)?.controls?.enabledDays, data:data?.promotionDates?.recurringDates?.enabledDays})
              this.sortEnabledDays(data?.promotionDates?.recurringDates?.enabledDays || getEnumValues(DayOfWeek)).map(item => new FormControl(item)),
              [ArrayValidators.minElements(1)]
            )
          })
        })
      }


    } else {//data?.staticDatesWithPricing
      //return {}

      return formBuilder.group({
        staticDatesWithPricing: formBuilder.group({
          [data?.staticDatesWithPricing?.id ? 'id' : 'tempId']: [data?.staticDatesWithPricing?.id ? data?.staticDatesWithPricing?.id : data?.StaticDatesWithPricing?.tempId || getRandomString(32)],
          dates: formBuilder.group(
            ((this.bufferPromotionData?.promotionDates?.staticDates?.dates && this?.bufferPromotionData?.promotionDate == 'specific' && (data?.dates ? data.dates == "same" : true)) ? this.bufferPromotionData.promotionDates.staticDates.dates || [] : (data?.staticDatesWithPricing?.dates ? Object.keys(data?.staticDatesWithPricing?.dates).sort() : [''])).reduce((prev, cur) => {
              prev[cur] = [data?.staticDatesWithPricing?.dates?.[cur] || 0, [ObjectValidators.hasKeyValue]];
              return prev;
            }, {})
          )
        })
      })
    }
  }

  getQuestionFormGroup(data, questionType?, getDefaultFormGroup?) {
    getDefaultFormGroup = getDefaultFormGroup || true;
    let QuestionTypes = this.QuestionTypes;
    let formBuilder = this.formBuilder;

    function getQuestion(data) {
      return {
        [data?.id ? 'id' : 'tempId']: [data?.id ? data?.id : data?.tempId || getRandomString(32)],
        title: [data?.title || '', [Validators.required, Validators.minLength(3)]],
        description: [data?.description || ''],
        showHeadings: [data.showHeadings != undefined ? data.showHeadings : true],
        //category: [Category],
        mandatory: [data.mandatory != undefined ? data.mandatory : false],
        displayCriteria: formBuilder.group({
          [data?.displayCriteria?.id ? 'id' : 'tempId']: [data?.displayCriteria?.id ? data?.displayCriteria?.id : data?.displayCriteria?.tempId || getRandomString(32)],
          comparisonQuestion: (() => {
            if (data?.displayCriteria?.comparisonQuestion) {
              let questionType = Object.keys(data?.displayCriteria?.comparisonQuestion)[0];
              return formBuilder.group({
                [questionType]: formBuilder.group({
                  [data?.displayCriteria?.comparisonQuestion[questionType]?.id ? 'id' : 'tempId']: [data?.displayCriteria?.comparisonQuestion[questionType]?.id || data?.displayCriteria?.comparisonQuestion[questionType]?.tempId]
                })
              })
            } else {
              return [null]
            }
          })(),

          comparisonType: [data?.displayCriteria?.comparisonType || ComparisonType[0]],
          comparisonValue: [data?.displayCriteria?.comparisonValue || '']
        }),
        //tempId: [String]    
      }
    }

    let question = {};

    switch (questionType) {
      case QuestionTypes[0]: {
        if (!getDefaultFormGroup) {
          question = {
            ...getQuestion(data),
            options: formBuilder.array(data.options ?
              data.options.map(x => {
                return formBuilder.group({
                  [x?.id ? 'id' : 'tempId']: [x?.id ? x?.id : x?.tempId || getRandomString(32)],
                  title: [x.title || '', [Validators.required]],
                  description: [x.description || ''],
                  cost: [x.cost || 0]
                });
              })
              :
              [formBuilder.group({
                ['tempId']: [getRandomString(32)],
                title: ['', [Validators.required]],
                description: [''],
                cost: [0]
              })]
            ),//Array<MultiChoiceQuestionOption>
            displayMethod: [data?.displayMethod || DisplayMethod[0]],
            taxes: formBuilder.array(data?.taxes ?
              data?.taxes.map(x => {
                return formBuilder.group({
                  [x?.id ? 'id' : 'tempId']: [x?.id ? x?.id : x?.tempId || getRandomString(32)],
                  tax: formBuilder.group({
                    [x?.tax?.id ? 'id' : 'tempId']: [x?.tax?.id ? x?.tax?.id : x?.tempId || getRandomString(32)],
                    name: [x?.tax?.name || '', [Validators.required]],
                    taxType: [x?.tax?.taxType || TaxType[0]]
                  }),
                  amount: [x?.amount != undefined ? x.amount : 0]
                });//TaxAmount
              })
              :
              [formBuilder.group({
                ['tempId']: [getRandomString(32)],
                tax: formBuilder.group({
                  ['tempId']: [getRandomString(32)],
                  name: ['', [Validators.required]],
                  taxType: [TaxType[0]]
                }),
                amount: [0]
              })]
            ),//Array<TaxAmount>
            selectMultiple: [data?.selectMultiple != undefined ? !!data.selectMultiple : false],//Boolean
            buyMultiple: formBuilder.group({
              minimum: [data?.buyMultiple?.minimum || 1],
              maximum: [data?.buyMultiple?.maximum || 0]
            }),//Map<RangeLimitType, number>
            pricingDependsOn: (() => {
              if (data?.pricingDependsOn) {
                let questionType = Object.keys(data?.pricingDependsOn)[0];
                return formBuilder.group({
                  [questionType]: formBuilder.group({
                    [data?.pricingDependsOn[questionType]?.id ? 'id' : 'tempId']: [data?.pricingDependsOn[questionType]?.id || data?.pricingDependsOn[questionType]?.tempId]
                  })
                })
              } else {
                return [null]
              }
            })(),//Question
            pricingDependencyMethod: [data?.pricingDependencyMethod || PricingMethod[0]],//PricingMethod
            sameValueAs: [data?.sameValueAs || ''],
            attendeeCountIncrement: (() => {
              let addsToAttendeeCountValue = data?.tags?.addsToAttendeeCount != undefined ? data?.tags?.addsToAttendeeCount : false;
              let attendeeCountIncrement = new FormControl(addsToAttendeeCountValue ? data?.attendeeCountIncrement || 1 : 1, [CommonValidators.conditional((control) => addsToAttendeeCountValue, Validators.min(1))])
              return attendeeCountIncrement
            })(),
            tags: (() => {
              let addsToAttendeeCount = new FormControl(data?.tags?.addsToAttendeeCount != undefined ? data?.tags?.addsToAttendeeCount : false);
              return new FormGroup({
                addsToAttendeeCount
              });
            })()
          }
        }
      } case QuestionTypes[1]: {
        if (!getDefaultFormGroup) {
          question = {
            ...getQuestion(data),
            possibleDates: this.getPossibleDatesFormGroup(data?.possibleDates),//ConfiguredDates
            basePrices: formBuilder.group({
              sunday: [data?.basePrices?.sunday || 0],
              monday: [data?.basePrices?.monday || 0],
              tuesday: [data?.basePrices?.tuesday || 0],
              wednesday: [data?.basePrices?.wednesday || 0],
              thursday: [data?.basePrices?.thursday || 0],
              friday: [data?.basePrices?.friday || 0],
              saturday: [data?.basePrices?.saturday || 0]
            }),//Map<DayOfWeek, number>
            pricingMethod: [data.pricingMethod || PricingMethod[0]],//PricingMethod
            taxes: formBuilder.array(data?.taxes ?
              data?.taxes.map(x => {
                return formBuilder.group({
                  [x?.id ? 'id' : 'tempId']: [x?.id ? x?.id : x?.tempId || getRandomString(32)],
                  tax: formBuilder.group({
                    [x?.tax?.id ? 'id' : 'tempId']: [x?.tax?.id ? x?.tax?.id : x?.tempId || getRandomString(32)],
                    name: [x?.tax?.name || '', [Validators.required]],
                    taxType: [x?.tax?.taxType || TaxType[0]]
                  }),
                  amount: [x?.amount != undefined ? x.amount : 0]
                });//TaxAmount
              })
              :
              [formBuilder.group({
                ['tempId']: [getRandomString(32)],
                tax: formBuilder.group({
                  ['tempId']: [getRandomString(32)],
                  name: ['', [Validators.required]],
                  taxType: [TaxType[0]]
                }),
                amount: [0]
              })]
            ),//Array<TaxAmount>
            selectMultiple: formBuilder.group({
              minimum: [data?.selectMultiple?.minimum || 1],
              maximum: [data?.selectMultiple?.maximum || 0]
            }),
            selectMultipleType: [data.selectMultipleType || SelectionType[0]],//SelectionType
            buyMultiple: formBuilder.group({
              minimum: [data?.buyMultiple?.minimum || 1],
              maximum: [data?.buyMultiple?.maximum || 0]
            }),//Map<RangeLimitType, number>
            optionCostsFixed: [data?.optionCostsFixed || true],
            attendeeCountIncrement: (() => {
              let addsToAttendeeCountValue = data?.tags?.addsToAttendeeCount != undefined ? data?.tags?.addsToAttendeeCount : false;
              let attendeeCountIncrement = new FormControl(addsToAttendeeCountValue ? data?.attendeeCountIncrement || 1 : 1, [CommonValidators.conditional((control) => addsToAttendeeCountValue, Validators.min(1))])
              return attendeeCountIncrement
            })(),
            tags: (() => {
              let isAttendanceDate = new FormControl(data?.tags?.isAttendanceDate != undefined ? data?.tags?.isAttendanceDate : false);
              let addsToAttendeeCount = new FormControl(data?.tags?.addsToAttendeeCount != undefined ? data?.tags?.addsToAttendeeCount : false);
              return new FormGroup({
                isAttendanceDate,
                addsToAttendeeCount
              });
            })()
          }
        }
      } case QuestionTypes[2]: {
        if (!getDefaultFormGroup) {
          question = {
            ...getQuestion(data),
            contentType: [getEnumValues(ContentType).includes(data.contentType) ? data.contentType : ContentType[0]],//ContentType
            validationRegex: [data.validationRegex || ''],//String
            defaultValue: (() => {
              return [data.defaultValue || '', [CommonValidators.conditional((control) => !!RegExpValidators.testRegexp(control?.parent?.get('validationRegex')?.value || '')(control)?.regexp)]];
            })(),
            valueLimits: formBuilder.group({
              minimum: [data?.valueLimits?.minimum || 0],
              maximum: [data?.valueLimits?.maximum || 0]
            })
          }
        }
      } case QuestionTypes[3]: {
        if (!getDefaultFormGroup) {
          question = { ...getQuestion(data) }
        }
      } default: {
        let defaultFormGroupQuestion = {
          ...getQuestion(data),
          options: formBuilder.array(data.options ?
            data.options.map(x => {
              return formBuilder.group({
                [x?.id ? 'id' : 'tempId']: [x?.id ? x?.id : x?.tempId || getRandomString(32)],
                title: [x.title || '', [Validators.required]],
                description: [x.description || ''],
                cost: [x.cost || 0]
              });
            })
            :
            [formBuilder.group({
              ['tempId']: [getRandomString(32)],
              title: ['', [Validators.required]],
              description: [''],
              cost: [0]
            })]
          ),//Array<MultiChoiceQuestionOption>
          displayMethod: [data?.displayMethod || DisplayMethod[0]],
          taxes: formBuilder.array(data?.taxes ?
            data?.taxes.map(x => {
              return formBuilder.group({
                [x?.id ? 'id' : 'tempId']: [x?.id ? x?.id : x?.tempId || getRandomString(32)],
                tax: formBuilder.group({
                  [x?.tax?.id ? 'id' : 'tempId']: [x?.tax?.id ? x?.tax?.id : x?.tax?.tempId || getRandomString(32)],
                  name: [x?.tax?.name || '', [Validators.required]],
                  taxType: [x?.tax?.taxType || TaxType[0]]
                }),
                amount: [x?.amount != undefined ? x.amount : 0]
              });//TaxAmount
            })
            :
            [formBuilder.group({
              ['tempId']: [getRandomString(32)],
              tax: formBuilder.group({
                ['tempId']: [getRandomString(32)],
                name: ['', [Validators.required]],
                taxType: [TaxType[0]]
              }),
              amount: [0]
            })]
          ),//Array<TaxAmount>
          pricingDependsOn: (() => {
            if (data?.pricingDependsOn) {
              let questionType = Object.keys(data?.pricingDependsOn)[0];
              return formBuilder.group({
                [questionType]: formBuilder.group({
                  [data?.pricingDependsOn[questionType]?.id ? 'id' : 'tempId']: [data?.pricingDependsOn[questionType]?.id || data?.pricingDependsOn[questionType]?.tempId]
                })
              })
            } else {
              return [null]
            }
          })(),//Question
          pricingDependencyMethod: [data?.pricingDependencyMethod || PricingMethod[0]],//PricingMethod
          sameValueAs: [data?.sameValueAs || ''],
          possibleDates: this.getPossibleDatesFormGroup(data?.possibleDates),//ConfiguredDates
          basePrices: formBuilder.group({
            sunday: [data?.basePrices?.sunday || 0],
            monday: [data?.basePrices?.monday || 0],
            tuesday: [data?.basePrices?.tuesday || 0],
            wednesday: [data?.basePrices?.wednesday || 0],
            thursday: [data?.basePrices?.thursday || 0],
            friday: [data?.basePrices?.friday || 0],
            saturday: [data?.basePrices?.saturday || 0]
          }),//Map<DayOfWeek, number>
          pricingMethod: [data.pricingMethod || PricingMethod[0]],//PricingMethod
          selectMultiple: questionType == QuestionTypes[1] && data.selectMultiple ? formBuilder.group({
            minimum: [data.selectMultiple?.minimum || 1],
            maximum: [data.selectMultiple?.maximum || 0]
          }) : [data?.selectMultiple != undefined ? !!data.selectMultiple : false],
          selectMultipleType: [data.selectMultipleType || SelectionType[0]],//SelectionType
          buyMultiple: data.buyMultiple ? formBuilder.group({
            minimum: [data.buyMultiple?.minimum || 1],
            maximum: [data.buyMultiple?.maximum || 0]
          }) : [data?.buyMultiple != undefined ? !!data.buyMultiple : false],//Map<RangeLimitType, number>
          contentType: [data.contentType || ContentType[0]],//ContentType
          validationRegex: [data.validationRegex || ''],//String
          defaultValue: (() => {
            return [data.defaultValue || '', [CommonValidators.conditional((control) => !!RegExpValidators.testRegexp(control?.parent?.get('validationRegex')?.value || '')(control)?.regexp)]];
          })(),
          valueLimits: formBuilder.group({
            minimum: [data?.valueLimits?.minimum || 0],
            maximum: [data?.valueLimits?.maximum || 0]
          }),
          optionCostsFixed: [data?.optionCostsFixed || true],
          attendeeCountIncrement: (() => {
            let addsToAttendeeCountValue = data?.tags?.addsToAttendeeCount != undefined ? data?.tags?.addsToAttendeeCount : false;
            let attendeeCountIncrement = new FormControl(addsToAttendeeCountValue ? data?.attendeeCountIncrement || 1 : 1, [CommonValidators.conditional((control) => addsToAttendeeCountValue, Validators.min(1))])
            return attendeeCountIncrement
          })(),
          tags: (() => {
            let isAttendanceDate = new FormControl(data?.tags?.isAttendanceDate != undefined ? data?.tags?.isAttendanceDate : false);
            let addsToAttendeeCount = new FormControl(data?.tags?.addsToAttendeeCount != undefined ? data?.tags?.addsToAttendeeCount : false);
            return new FormGroup({
              isAttendanceDate,
              addsToAttendeeCount
            });
          })(),

          //interface
          basePrice: [uniqueArr(Object.keys(data?.basePrices || []).map(key => data?.basePrices[key])).length == 1 ? 'standardPricing' : 'perDayPricing'],
          addTaxes: [data?.taxes?.length ? true : false],
          dates: [(() => {
            let dateList = Object.keys(data?.possibleDates?.['staticDatesWithPricing']?.['dates'] || []);
            return this.bufferPromotionData.promotionDate == "specific" || dateList.every(item => (this.bufferPromotionData?.promotionDates?.staticDates?.dates || []).includes(item)) ? 'same' : 'specific'
          })()],
          selectMultipleOptions: [data?.selectMultiple ? true : false],
          buyMultipleOptions: [data?.buyMultiple ? true : false],
          pricing: [data?.pricingDependencyMethod ? data?.pricingDependencyMethod == 'perQuantity' ? 'perQuantity' : ['perDay', 'perNight'].includes(data?.pricingDependencyMethod) ? 'perDate' : 'asIs' : 'asIs'],
          display: [data?.sameValueAs ? 'never' : !data?.displayCriteria?.comparisonQuestion ? 'always' : 'conditional'],
        };

        question = defaultFormGroupQuestion;
      }
    }

    return question;
  }

  initQuestionInterfaceSubscriptions(question: FormGroup) {
    let questionForm = question.controls[Object.keys(question.controls)[0]] as FormGroup;
    if (questionForm?.controls?.basePrice) {
      questionForm.controls.basePrice.valueChanges.subscribe((val) => {
        if (val == 'standardPricing') {
          let basePricesFormGroup = questionForm.controls?.basePrices as FormGroup;
          let basePricesControls = [
            basePricesFormGroup?.controls?.sunday,
            basePricesFormGroup?.controls?.monday,
            basePricesFormGroup?.controls?.tuesday,
            basePricesFormGroup?.controls?.wednesday,
            basePricesFormGroup?.controls?.thursday,
            basePricesFormGroup?.controls?.friday,
            basePricesFormGroup?.controls?.saturday
          ];

          let basePricesValues = basePricesControls.map(control => +control.value);
          let isEqualValues = uniqueArr(basePricesValues).length == 1;
          let modValue = findMod(basePricesValues) || 0;

          basePricesControls.forEach(control => {
            control.setValue(isEqualValues ? +basePricesControls[0].value : +modValue, { onlySelf: true, emitEvent: false });
          });

          basePricesFormGroup.updateValueAndValidity();

        } else if (val == 'perDayPricing') {

        }
      });
    }

  }

  getQuestionSelectCollection(questionsFormArray) {
    return questionsFormArray.map(questionFormGroup => {
      let questionType = Object.keys(questionFormGroup.controls)[0];
      let questionFormData = questionFormGroup.controls[questionType];
      let value = questionFormData?.controls?.id || questionFormData?.controls?.tempId;
      let title = questionFormData?.controls?.title || '';
      return {
        value: value.value,
        title: title.value
      };
    })
  }

  isValidControl(control) {
    return control.valid;
  }

  getShortPromotionQuestion(question: Object, isAbstractForm?: boolean) {
    isAbstractForm = isAbstractForm != undefined ? isAbstractForm : false;
    let questionType = Object.keys(question)[0];
    if (isAbstractForm) {
      return this.formBuilder.group({
        [questionType]: this.formBuilder.group({
          [question[questionType]?.id ? 'id' : 'tempId']: [question[questionType]?.id || question[questionType]?.tempId]
        })
      })
    } else {
      return {
        [questionType]: {
          [question[questionType]?.id ? 'id' : 'tempId']: question[questionType]?.id || question[questionType]?.tempId
        }
      }
    }

  }

  getPromotionQuestionById(categoryId, questionId) {
    categoryId = '' + categoryId;
    questionId = '' + questionId;
    let category = (typeof categoryId == 'string') && categoryId ? (this.promotionDataGroup?.controls?.categories as FormArray).controls.filter((category: FormGroup) => {
      return (
        ('' + category?.controls?.id?.value == categoryId) ||
        ('' + category?.controls?.tempId?.value == categoryId)
      );
    })?.[0] as FormGroup || null : null;
    let question = (typeof questionId == 'string') && questionId ? (category.controls.questions as FormArray)?.controls?.filter((question: FormGroup) => {
      let questionType = Object.keys(question.controls)[0];
      return (
        ('' + (question?.controls?.[questionType] as FormGroup)?.controls?.id?.value == questionId) ||
        ('' + (question?.controls?.[questionType] as FormGroup)?.controls?.tempId?.value == questionId)
      );
    })?.[0] as FormGroup || null : null;
    return {
      category,
      question
    }
  }

  getPromotionQuestions(categoryIndex, questionType?, exceptId?) {

    let questions = (((this.promotionDataGroup?.controls?.categories as FormArray).controls[categoryIndex] as FormGroup).controls.questions as FormArray).controls
      .filter(item => {
        let formGroup = (item as FormGroup);
        let type = Object.keys(formGroup.controls)[0];
        let questionFormGroup = (formGroup.controls[questionType] as FormGroup);

        if (questionType) {
          if (exceptId) {
            return (questionFormGroup?.controls?.['id'] || questionFormGroup?.controls?.['tempId'])?.value != undefined && (questionFormGroup?.controls?.['id'] || questionFormGroup?.controls?.['tempId'])?.value != exceptId;
          } else {
            return questionFormGroup;
          }
        } else {
          if (exceptId) {
            return ((formGroup?.controls?.[type] as FormGroup)?.controls?.['id'] || (formGroup?.controls?.[type] as FormGroup)?.controls?.['tempId'])?.value != exceptId;
          } else {
            return true;
          }
        }

      });

    return questions;
  }

  promotionQuestionsIncludes(categoryQuestionsFormArray, id) {
    return categoryQuestionsFormArray.some(question => {
      let type = Object.keys(question.controls)[0];
      return (question.controls[type].controls?.id?.value || question.controls[type].controls?.tempId?.value) == id;
    })
  }

  changeQuestionType(categoryIndex, questionIndex, questionType) {
    let promotionDataGroup = this.promotionDataGroup as FormGroup;
    let formBuilder = this.formBuilder;
    let currentCategory = (promotionDataGroup?.controls?.categories as FormArray).controls[categoryIndex] as FormGroup;
    let currentQuestion = (currentCategory.controls.questions as FormArray).controls[questionIndex] as FormGroup;
    let currentQuestionType = Object.keys(currentQuestion.controls)[0];
    let defaultQuestionData = PreviewComponent.getDefaultPromotionData((PreviewComponent.getFormattedPromotionData(this.bufferPromotionData) as any));
    let currentData = defaultQuestionData.categories[categoryIndex].questions[questionIndex][currentQuestionType];//(question.controls[currentQuestionType] as FormGroup).getRawValue();

    let questionFormGroup = this.getQuestionFormGroup(currentData, questionType);
    //currentQuestion.removeControl(currentQuestionType);
    //currentQuestion.addControl(questionType, formBuilder.group(questionFormGroup));//!BUG does not have a parent (this.promotionDataGroup)
    let thisFormGroup = this.replaceFormControl(currentQuestion.get(currentQuestionType), formBuilder.group(questionFormGroup), currentQuestionType);
    this.renameFormControl(thisFormGroup.get(currentQuestionType), questionType);

    promotionDataGroup.value.categories.forEach((category, categoryIndex) => {
      category.questions.forEach((question, questionIndex) => {
        let thisQuestionType = Object.keys(question)[0];
        let questionForm = (((promotionDataGroup.get('categories') as FormGroup).controls[categoryIndex].get('questions') as FormGroup).controls[questionIndex] as FormGroup).controls[thisQuestionType] as FormGroup;

        //displayCriteria
        let displayCriteria = (questionForm?.controls?.displayCriteria as FormGroup);
        let comparisonQuestionType = (displayCriteria?.controls?.comparisonQuestion as FormGroup)?.controls ? Object.keys((displayCriteria?.controls?.comparisonQuestion as FormGroup)?.controls)?.[0] : null;
        if (comparisonQuestionType) {
          let comparisonQuestion = (displayCriteria?.controls?.comparisonQuestion as FormGroup);
          let comparisonQuestionData = comparisonQuestion?.controls?.[comparisonQuestionType] as FormGroup;

          let comparisonQuestionId = comparisonQuestionData?.controls?.id?.value || comparisonQuestionData.controls?.tempId?.value;
          if (comparisonQuestionId == (currentQuestion.controls?.[questionType] as FormGroup)?.controls?.id?.value || comparisonQuestionId == (currentQuestion.controls?.[questionType] as FormGroup).controls?.tempId?.value) {
            replaceFormControl(comparisonQuestion, this.getShortPromotionQuestion(formBuilder.group({ [questionType]: formBuilder.group(questionFormGroup) }).value, true), 'comparisonQuestion');
          }
        }

        //pricingDependsOn
        //|| !promotionQuestionsIncludes(getPromotionQuestions(categoryIndex, 'dateQuestion'), question.controls[Object.keys(question.controls)[0]]?.controls?.pricingDependsOn?.value)
        let pricingDependsOn = (questionForm?.controls?.pricingDependsOn as FormGroup);
        let pricingDependsOnType = pricingDependsOn?.controls ? Object.keys(pricingDependsOn?.controls)?.[0] : null;
        if (pricingDependsOnType) {

          let pricingDependsOnData = pricingDependsOn?.controls?.[comparisonQuestionType] as FormGroup;

          let pricingDependsOnId = pricingDependsOnData?.controls?.id?.value || pricingDependsOnData?.controls?.tempId?.value;
          if (pricingDependsOnId == (currentQuestion.controls?.[questionType] as FormGroup)?.controls?.id?.value || pricingDependsOnId == (currentQuestion.controls?.[questionType] as FormGroup).controls?.tempId?.value) {
            replaceFormControl(pricingDependsOn, this.getShortPromotionQuestion(formBuilder.group({ [questionType]: formBuilder.group(questionFormGroup) }).value, true), 'pricingDependsOn');
          }
        }

        setTimeout(() => {
          //this.setSelectMenuHandler(this.el.nativeElement.querySelectorAll("#newPromotionForm .form-group > select"), '.radio-menu .radio-menu-container');
          this.setSelectMenuHandler([...this.el.nativeElement.querySelectorAll('input[type=radio], input[type=radio][name], input[type=radio][ng-reflect-name]') as any], '.radio-menu-container');
        }, 1);

      })
    });
  }

  changeComparisonQuestion(categoryIndex, questionIndex, comparisonQuestionId) {
    let promotionDataGroup = this.promotionDataGroup as FormGroup;

    let category = (promotionDataGroup?.controls?.categories as FormArray).controls[categoryIndex] as FormGroup;
    let question = (category.controls.questions as FormArray).controls[questionIndex] as FormGroup;
    let questionType = Object.keys(question.controls)[0];
    let displayCriteria = ((question.controls[questionType] as FormGroup)?.controls?.displayCriteria as FormGroup);

    let targetQuestion = this.getPromotionQuestionById(category.controls?.id?.value || category.controls?.tempId?.value, comparisonQuestionId).question as FormGroup;
    let targetQuestionType = Object.keys(targetQuestion.controls)?.[0];

    let comparisonQuestion = (displayCriteria?.controls?.comparisonQuestion as FormGroup);
    //let comparisonQuestionData = comparisonQuestion?.controls?.[targetQuestionType] as FormGroup;

    replaceFormControl(comparisonQuestion, this.getShortPromotionQuestion(targetQuestion.value, true), 'comparisonQuestion');
  }

  changePricingDependsOn(categoryIndex, questionIndex, pricingDependsOnId) {
    let promotionDataGroup = this.promotionDataGroup as FormGroup;

    let category = (promotionDataGroup?.controls?.categories as FormArray).controls[categoryIndex] as FormGroup;
    let question = (category.controls.questions as FormArray).controls[questionIndex] as FormGroup;
    let questionType = Object.keys(question.controls)[0];
    let pricingDependsOn = ((question.controls[questionType] as FormGroup)?.controls?.pricingDependsOn as FormGroup);

    let targetQuestion = this.getPromotionQuestionById(category.controls?.id?.value || category.controls?.tempId?.value, pricingDependsOnId).question as FormGroup;
    let targetQuestionType = Object.keys(targetQuestion.controls)?.[0];


    replaceFormControl(pricingDependsOn, this.getShortPromotionQuestion(targetQuestion.value, true), 'pricingDependsOn');
  }

  savePromotion() {
    if (this.promotionDataGroup.valid) {
      let data = { promotion: PreviewComponent.getDefaultPromotionData((PreviewComponent.getFormattedPromotionData(this.bufferPromotionData) as any)) };
      let promootionSaveEvent = new CustomEvent("promotion-save", { bubbles: true, detail: data });
      document.dispatchEvent(promootionSaveEvent);
      window.parent.postMessage({ "action": "promotion-save", data: data }, "*");
      // this.promotionService.sendPromotionData(data).subscribe(response=>{
      //   if (response.status == 200) {
      //     redirectTo('/admin/promotions/promotionManagement.html');
      //   }
      // })

    }
  }

  cancelPromotion() {
    //redirectTo('/admin/promotions/promotionManagement.html');

    let promootionCancelEvent = new Event("promotion-cancel", { bubbles: true });
    document.dispatchEvent(promootionCancelEvent);
    window.parent.postMessage({ "action": "promotion-cancel" }, "*");
  }

  /*tabs*/
  isActive(tab) {
    return tab.querySelector('a').getAttribute('aria-controls') == this.activeTab;
  }

  changeTab(tab) {
    this.activeTab = tab.querySelector('a').getAttribute('aria-controls');
  }

  initTabs(id) {
    var triggerTabList = [].slice.call(document.querySelectorAll(`#${id} a[data-toggle="tab"]`))

    triggerTabList.forEach(function (triggerEl) {
      let tabId = triggerEl.getAttribute('data-target');
      let tab = document.querySelector(tabId);
      let li = triggerEl.parentElement;
      let activeClass = 'active';

      if (li.classList.contains(activeClass)) {
        activateTabs();
      }

      //triggerEl.addEventListener('click', () => {
      triggerEl.onclick = () => {
        if (!li.classList.contains(activeClass)) {
          activateTabs();
        }
      }

      function activateTabs() {
        li.classList.add('active');
        tab.classList.add('active');
        triggerTabList.forEach(item => {
          if (item != triggerEl) {
            let tabId = item.getAttribute('data-target');
            let tab = document.querySelector(tabId);
            let li = item.parentElement;
            li.classList.remove('active');
            tab.classList.remove('active');
          }
        });
      }


    })
  }
  /*end tabs*/

  /*air-datepicker handlers*/
  datepickerRenderCellHandler(...args) {

    let options = args.length == 1 || typeof args[0] == 'object' ? args[0] : { date: args[0], cellType: args[1], datepicker: args[2] };
    let { date, cellType, datepicker } = options;

    // if (cellType == 'day') {
    //   let datePattern = "YYYY-MM-DD";
    //   let dateString = moment(date).format(datePattern)
    //   let disabledDates = [...(this as any)?.nativeElement?.dataset?.disabledDates?.split(',') || []]?.map(item=>item.trim());
    //   return {
    //     disabled: disabledDates.includes(dateString) ? true : false
    //   }
    // }

    let promotionData = this.promotionDataGroup?.value;
    if (cellType == 'day' && promotionData) {
      let datePattern = "YYYY-MM-DD";

      let multipleDate = (() => {
        return (() => {
          if (promotionData.promotionDate == 'specific') {
            return promotionData?.promotionDates?.staticDates?.dates || [];
          } else if (promotionData.promotionDate == 'recurring') {
            if (promotionData.endRecurrence == 'limited') {
              return getDates((moment(promotionData.promotionDates.recurringDates.firstDates[0], datePattern) as any)._d, (moment(promotionData.promotionDates.recurringDates.lastDate, datePattern) as any)._d).map(date => moment(date).format(datePattern));
            } else {
              return [(moment(promotionData.promotionDates.recurringDates.firstDates[0], datePattern) as any)._d].map(date => moment(date).format(datePattern));
            }
          } else {
            return [];
          }
        })()
      })();

      var multipleDates = multipleDate ? multipleDate.filter(item => this.momentIsDate(item, datePattern)).map(item => (moment(item, datePattern) as any)._d) : [];
      var disableOtherDates = [...(this as any)?.nativeElement?.dataset?.disabledDates?.split(',') || []]?.map(item => item.trim()).filter(item => this.momentIsDate(item, datePattern));

      //if (question[questionType].dates == 'same') {
      if (multipleDates.length || disableOtherDates.length) {
        let enabledDays = promotionData?.promotionDates?.recurringDates?.enabledDays || getEnumValues(DayOfWeek) || [];
        var availableDates = (() => {

          let array = [...multipleDates, ...disableOtherDates];

          // if (question[questionType].selectMultipleType == 'range' && question[questionType].selectMultiple) {
          //   array = array.sort((a, b) => a - b);
          //   array = getDates(array[0], array[array.length - 1]);
          // }

          if (promotionData.promotionDate == 'recurring') {
            let recurrencePeriod = promotionData.promotionDates.recurringDates.recurrencePeriod;
            let recurrenceInterval = promotionData.promotionDates.recurringDates.recurrenceInterval;

            const RRule = this.rrule.RRule;
            let rule = new RRule((() => {
              let obj = {
                freq: [recurrencePeriod].map(freq => {
                  switch (freq) {
                    case 'days':
                      return RRule.DAILY;
                    case 'weeks':
                      return RRule.WEEKLY;
                    case 'months':
                      return RRule.MONTHLY;
                    case 'years':
                      return RRule.YEARLY;
                    default:
                      return RRule.DAILY;
                  }
                })[0],
                dtstart: array[0],
                count: promotionData.endRecurrence == 'limited' ? array.length : 42,
                interval: +recurrenceInterval
              };
              if (promotionData.endRecurrence == 'limited') {
                obj['until'] = array[array.length - 1];
              }
              return obj;
            })());

            array = rule.all();
          }

          return array;
        })();
        var isDisabled = (availableDates.map(date => moment(date).format(datePattern)).indexOf(moment(date).format(datePattern)) == -1) || enabledDays.every(dayOfWeek => !this.momentIsSpecificDay(date, dayOfWeek));

        return {
          disabled: isDisabled
        }
      } else {
        return {
          disabled: promotionData.promotionDate == 'noDate' ? false : true
        }
      }
      //}
    } return {
      disabled: false
    }

  }

  specificDatesDPRenderCellHandler(...args) {

    let options = args.length == 1 || typeof args[0] == 'object' ? args[0] : { date: args[0], cellType: args[1], datepicker: args[2] };
    let { date, cellType, datepicker } = options;
    // if (cellType == 'day') {
    //   let datePattern = "YYYY-MM-DD";
    //   let dateString = moment(date).format(datePattern)
    //   let disabledDates = [...(this as any)?.nativeElement?.dataset?.disabledDates?.split(',') || []]?.map(item=>item.trim());
    //   return {
    //     disabled: disabledDates.includes(dateString) ? true : false
    //   }
    // }


    let promotionData = this.promotionDataGroup?.value;
    if (cellType == 'day' && promotionData) {
      let datePattern = "YYYY-MM-DD";

      let multipleDate = (() => {
        return (() => {
          if (promotionData.promotionDate == 'specific') {
            return promotionData?.promotionDates?.staticDates?.dates || [];
          } else if (promotionData.promotionDate == 'recurring') {
            if (promotionData.endRecurrence == 'limited') {
              return getDates((moment(promotionData.promotionDates.recurringDates.firstDates[0], datePattern) as any)._d, (moment(promotionData.promotionDates.recurringDates.lastDate, datePattern) as any)._d).map(date => moment(date).format(datePattern));
            } else {
              return [(moment(promotionData.promotionDates.recurringDates.firstDates[0], datePattern) as any)._d].map(date => moment(date).format(datePattern));
            }
          } else {
            return [];
          }
        })()
      })();

      var multipleDates = multipleDate ? multipleDate.filter(item => this.momentIsDate(item, datePattern)).map(item => (moment(item, datePattern) as any)._d) : [];
      var disableOtherDates = [...(this as any)?.nativeElement?.dataset?.disabledDates?.split(',') || []]?.map(item => item.trim()).filter(item => this.momentIsDate(item, datePattern));

      //if (question[questionType].dates == 'same') {
      if (multipleDates.length || disableOtherDates.length) {
        var availableDates = (() => {

          let array = [...multipleDates, ...disableOtherDates];

          return array;
        })();
        var isDisabled = availableDates.map(date => moment(date).format(datePattern)).indexOf(moment(date).format(datePattern)) == -1;

        return {
          disabled: !isDisabled
        }
      } else {
        return {
          disabled: false
        }
      }
      //}
    } else {
      return {
        disabled: false
      }
    }

  }
  /*end air-datepicker handlers*/
  /*old functions*/
  endRecurrenceHandler(event, firstDate, lastDate) {

    let endRecurrence = this.promotionDataGroup.controls.endRecurrence.value;

    let opts = { silent: true };
    let $firstDatePicker = firstDate.datepickerInstance;//$(firstDate).data('datepicker');
    let firstDatesArray = [...$firstDatePicker.selectedDates];
    let thisStringArray = this.Object.keys(this.getDateStringObject(firstDatesArray, true));


    if (endRecurrence == "limited") {
      $firstDatePicker.clear(opts);
      $firstDatePicker.selectDate([], opts);
      firstDate.value = (this.getFormattedSelectedDates(firstDate)?.[0] || '');
      lastDate.value = (this.getFormattedSelectedDates(lastDate)?.[1] || '');

    } else {
      let $lastDatePicker = $(lastDate).data('datepicker');
      $lastDatePicker.clear(opts);
      $lastDatePicker.selectDate([], opts);
      firstDate.value = thisStringArray.length == 2 ? thisStringArray[0] : thisStringArray?.[0] || (this.getFormattedSelectedDates(firstDate)?.[0] || '');
      lastDate.value = '';//(this.getFormattedSelectedDates(lastDate)?.[1] || '');
    }

  }

  onTemporaryChanged(input, firstDate, lastDate) {

    let endRecurrence = this.promotionDataGroup.controls.endRecurrence.value;

    let opts = { silent: true };
    let datepickerInstance = input.datepickerInstance;//$(input).data('datepicker');
    let selectedDates = datepickerInstance.selectedDates;//datepickerInstance?.temporaryDates;

    let $firstDatePicker = firstDate.datepickerInstance;//$(firstDate).data('datepicker');
    let $lastDatePicker = lastDate.datepickerInstance;//$(lastDate).data('datepicker');

    let thisStringArray = Object.keys(this.getDateStringObject(selectedDates, true));

    $firstDatePicker.clear(opts);
    $lastDatePicker.clear(opts);
    $firstDatePicker.selectDate(selectedDates, opts);
    $lastDatePicker.selectDate(selectedDates, opts);

    if (endRecurrence == "limited") {
      firstDate.value = (this.getFormattedSelectedDates(firstDate)?.[0] || '');
      lastDate.value = (this.getFormattedSelectedDates(lastDate)?.[1] || '');

    } else {
      firstDate.value = thisStringArray.length == 2 ? thisStringArray[0] : thisStringArray?.[0] || (this.getFormattedSelectedDates(firstDate)?.[0] || '');
      $lastDatePicker.selectDate($firstDatePicker.selectedDates, opts);
      lastDate.value = '';//(this.getFormattedSelectedDates(lastDate)?.[1] || '');
    }


  }

  getFormattedSelectedDates(input) {
    let datePattern = "YYYY-MM-DD";
    let datepickerInstance = input.datepickerInstance; //$(input)?.data('datepicker');
    let selectedDates = datepickerInstance?.selectedDates || []; //datepickerInstance?.temporaryDates || []
    return selectedDates.map(date => moment(date).format(datePattern));
  }

  recurringDatesClear(firstDate, lastDate) {
    let opts = { silent: true };
    let $lastDatePicker = lastDate.datepickerInstance;//$(lastDate).data('datepicker');
    let $firstDatePicker = firstDate.datepickerInstance;//$(firstDate).data('datepicker');

    lastDate.value = '';
    firstDate.value = '';

    $firstDatePicker.clear(opts);
    $firstDatePicker.selectDate([], opts);
    $lastDatePicker.clear(opts);
    $lastDatePicker.selectDate([], opts);
  }

  recurringDatesHandler(event, firstDate, lastDate) {
    let _this = this;
    let promotionDataGroup = this.promotionDataGroup;
    let endRecurrence = promotionDataGroup.controls.endRecurrence.value;
    let opts = { silent: true };

    let $firstDatePicker = firstDate.datepickerInstance;//$(firstDate).data('datepicker');
    let $lastDatePicker = lastDate.datepickerInstance;//$(lastDate).data('datepicker');

    if (!($firstDatePicker && $lastDatePicker)) return;

    let datepickerInstance = event.target.datepickerInstance;//$(event.target).data('datepicker');
    let siblingDatepickerInstance = event.target == firstDate ? $lastDatePicker : $firstDatePicker;

    let getUniqueDates = datepickerInstance.getUniqueDates;
    let compare = function (a1, a2) {
      return a1.length == a2.length && a1.every((v, i) => v === a2[i])
    }

    let uniqueDates = [
      getUniqueDates([...datepickerInstance.temporaryDates, ...datepickerInstance.selectedDates]),
      getUniqueDates([...siblingDatepickerInstance.temporaryDates, ...siblingDatepickerInstance.selectedDates])
    ];
    let uniqueDatesStrings = uniqueDates.map(dates => Object.keys(this.getDateStringObject(dates, true)));

    let selectedDates = [];
    let selectedDatesStrings = [];
    switch (true) {
      case (uniqueDates[0].length == 0): {
        selectedDates = [];
        selectedDatesStrings = [];
        break;
      }
      case (uniqueDates[0].length == 1): {
        if (compare(uniqueDatesStrings[0].sort(), uniqueDatesStrings[1].sort())) {
          selectedDates = uniqueDates[0];
          selectedDatesStrings = uniqueDatesStrings[0];
        } else {
          if (uniqueDates[0].length == uniqueDates[1].length) {
            selectedDates = getUniqueDates([...uniqueDates[0], ...uniqueDates[1]].sort());
            selectedDatesStrings = [...new Set([...uniqueDatesStrings[0], ...uniqueDatesStrings[1]].sort())];
          } else {
            selectedDates = uniqueDates[0];
            selectedDatesStrings = uniqueDatesStrings[0];
          }
        }
        break;
      }
      case (uniqueDates[0].length == 2): {
        selectedDates = uniqueDates[0];
        selectedDatesStrings = uniqueDatesStrings[0];
        break;
      }
      default: {

        break;
      }
    }

    //sort
    selectedDates = getUniqueDates([...datepickerInstance.selectionOrder.filter(item => {
      let itemStr = Object.keys(this.getDateStringObject([item], true))[0];
      return selectedDatesStrings.includes(itemStr)
    }), ...selectedDates]);
    selectedDatesStrings = selectedDates.map(item => Object.keys(this.getDateStringObject([item], true))[0]);

    console.log('recurringDatesHandler', selectedDates);
    if (
      !compare(selectedDatesStrings.sort(), uniqueDatesStrings[0].sort()) ||
      ((uniqueDates[0].length == uniqueDates[1].length) && !compare(uniqueDatesStrings[0].sort(), uniqueDatesStrings[1].sort())) ||
      (uniqueDates[0].length != uniqueDates[1].length)
    ) {
      datepickerInstance.clear(opts);
      datepickerInstance.selectDate(selectedDates, opts);
      siblingDatepickerInstance.clear(opts);
      siblingDatepickerInstance.selectDate(selectedDates, opts);
    }

    setDateInputValues(selectedDatesStrings);

    function setDateInputValues(datesStrings) {
      console.log('SIB', datepickerInstance, siblingDatepickerInstance);
      if (endRecurrence == "limited") {
        firstDate.value = datesStrings.length == 2 ? datesStrings[0] || (_this.getFormattedSelectedDates(firstDate)?.[0] || '') : datesStrings?.[0] || (_this.getFormattedSelectedDates(firstDate)?.[0] || '');
        lastDate.value = datesStrings.length == 2 ? datesStrings[1] || (_this.getFormattedSelectedDates(lastDate)?.[1] || '') : (_this.getFormattedSelectedDates(lastDate)?.[1] || '');
      } else {
        firstDate.value = datesStrings.length == 2 ? datesStrings[0] || (_this.getFormattedSelectedDates(firstDate)?.[0] || '') : datesStrings?.[0] || (_this.getFormattedSelectedDates(firstDate)?.[0] || '');
        //$lastDatePicker.selectDate($firstDatePicker.selectedDates, opts);
        lastDate.value = '';//(_this.getFormattedSelectedDates(lastDate)?.[1] || '');
      }

      let recurringDates = (promotionDataGroup.controls.promotionDates as FormGroup).controls.recurringDates as FormGroup;
      recurringDates.get('lastDate').setValue(lastDate.value);
      (recurringDates.get('firstDates') as FormArray).controls[0].setValue(firstDate.value);

      //setTimeout(() => {//!Bugfix
      _this.updatePossibleDates();
      //}, 1);
    }
  }

  getDateStringObject = (dateArray = [], sort) => {
    let datePattern = "YYYY-MM-DD";
    if (sort) {
      dateArray = dateArray.sort((a, b) => a - b);
    }
    return dateArray.reduce((prev, date) => {
      let dateStr = moment(date).format(datePattern);
      prev[dateStr] = date;
      return prev;
    }, {});
  };

  sortEnabledDays(enabledDays) {
    let matched: Array<string> = [];
    let supportedTypes = getEnumValues(DayOfWeek);
    supportedTypes.forEach(item => {
      if (enabledDays.includes(item)) {
        matched.push(item);
      }
    });
    return matched;
  }

  enabledDaysHandler(value) {
    let formArray = ((this.promotionDataGroup?.controls?.promotionDates as FormGroup)?.controls?.recurringDates as FormGroup)?.controls?.enabledDays;
    let impossibleToDeSelect = true;
    if (impossibleToDeSelect ? !(formArray.value.includes(value.toUpperCase()) && formArray.value.length == 1) : true) {
      switchFormArray(formArray, value.toUpperCase());
      formArray.patchValue(this.sortEnabledDays(formArray.value));
    }
  }

  getCurrentCustomAdditionalBccEmail(departmentId) {
    return this.customAdditionalBccEmail[departmentId] || '';
  }

  additionalBccEmailsChangeHandler(event?) {
    let departmentId = this.BCC.value
    let value = event?.target?.value || this.customAdditionalBccEmail[departmentId] || '';
    this.customAdditionalBccEmail[this.BCC.value] = value;
    let customEmails = this.promotionService.getAdditionDepartmentEmails(this.promotionDataGroup.controls?.notifyEmails?.value, departmentId);
    customEmails.forEach(item => removeFromFormArray(this.promotionDataGroup?.controls?.notifyEmails, item));
    return value ? addToFormArray(this.promotionDataGroup?.controls?.notifyEmails, value, true) : removeFromFormArray(this.promotionDataGroup?.controls?.notifyEmails, value)
  }


  getStaticDatesWithPricing(question) {
    let abstractControl = 'staticDatesWithPricing';
    let dates = (Object.keys(question.controls[Object.keys(question?.controls)[0]]?.controls?.possibleDates?.controls.staticDatesWithPricing?.controls?.dates?.value) || ['']).sort();
    let currentAbstractControl = this.abstractControlOrders.find(item => item.abstractControl == abstractControl);
    let currentIndex = dates.indexOf(dates.find(item => !this.momentIsDate(item, this.datePattern)));
    let newIndex = currentAbstractControl?.order || currentIndex;
    dates = newIndex != currentIndex ? moveArrayItem(currentIndex, newIndex, dates) : dates;
    return dates;
  }

  getSameAsPromotionStaticDates(question) {
    return uniqueArr(
      [...[
        getRawValueDeep(
          filterControls(
            (this.promotionDataGroup?.controls?.promotionDates as any)?.controls?.staticDates?.controls?.dates?.controls,
            this.isValidControl
          )
        ),
        (Object.keys(question?.controls[Object.keys(question?.controls)[0]]?.controls?.possibleDates?.controls.staticDatesWithPricing?.controls?.dates?.controls || {}) || ['']).sort()
      ].flat()]
    )
  }

  getDisabledStaticDates(question, dateIndex) {
    return filterArray(
      [
        ...Object.keys(question.controls[Object.keys(question?.controls)[0]]?.controls?.possibleDates?.controls.staticDatesWithPricing?.controls?.dates.value || ['']),
        //...(question?.controls[Object.keys(question?.controls)[0]]?.controls?.tags?.controls?.isAttendanceDate ? Object.keys(this.promotionDataGroup.get('blockedDates')?.value || {}) : [])
      ],
      [this.getStaticDatesWithPricing(question)[dateIndex]]
    )
  }

  updatePossibleDates() {
    let needChanges = false;
    this.promotionDataGroup.value.categories.forEach((category, categoryIndex) => {
      category.questions.forEach((question, questionIndex) => {
        let questionType = Object.keys(question)[0];
        let questionForm = (((this.promotionDataGroup.get('categories') as FormGroup)?.controls[categoryIndex].get('questions') as FormGroup)?.controls[questionIndex] as FormGroup)?.controls[questionType] as FormGroup;
        let possibleDates = (questionForm?.controls?.possibleDates as FormGroup);

        if ((questionForm?.controls?.dates?.value == 'same')) {
          if (this.promotionDataGroup.get('promotionDate').value == 'recurring') {
            let promotionDates = { recurringDates: this.promotionDataGroup?.controls?.promotionDates.value.recurringDates };
            replaceFormControl(possibleDates, this.getPossibleDatesFormGroup(promotionDates), 'possibleDates')
          } else if (this.promotionDataGroup.get('promotionDate').value == 'specific') {
            let promotionDates = {
              staticDatesWithPricing: {
                dates: this.promotionDataGroup?.controls?.promotionDates?.value?.staticDates?.dates?.reduce((prev, cur) => {
                  prev[cur] = 0;
                  return prev;
                }, {})
              }
            };

            let newFormControl = this.getPossibleDatesFormGroup(promotionDates);

            replaceFormControl(possibleDates, newFormControl, 'possibleDates');//!BAG
            let currentControlName = 'possibleDates';
            let formGroup = questionForm;

            if (Object.keys(formGroup?.controls).includes(currentControlName)) {
              let newControl = cloneAbstractControl(newFormControl);
              formGroup.removeControl(currentControlName, { emitEvent: false });
              formGroup.addControl(currentControlName, new FormGroup(newControl.controls));
            } else {
              let newControl = cloneAbstractControl(newFormControl);
              formGroup.addControl(currentControlName, new FormGroup(newControl.controls));
            }
            //console.log('questionForm',questionForm, newFormControl);
          }
          needChanges = true;
        }
      })
    });

    if (needChanges) {
      this.cdr.detectChanges();
    }
  }

  departmentChangeHandler(event) {
    const departmentId = this.promotionDataGroup?.controls?.department.value?.id;
    const displayTemplateControl = this.promotionDataGroup.controls?.displayTemplate;
    const hasDepartmentTemplate = this.promotionService.hasDepartmentTemplate(departmentId, displayTemplateControl?.value?.id);
    let templates = this.promotionService.getDepartmentTemplates(departmentId);

    //old:displayTemplateId && displayTemplateId === option.id ? hasDepartmentTemplate : !hasDepartmentTemplate && displayTemplateId !== option.id ? this.promotionDataGroup.controls?.displayTemplate.setValue(option) : i === 0 ? true : null;
    if (!hasDepartmentTemplate) {
      displayTemplateControl.setValue(templates[0]);
    }
  }

  setSelectMenuHandler(selects, menuContainerSelector, addEvent?, hiddenClassName?, activeClassName?) {
    addEvent = addEvent || true;
    selects = [...selects];
    let _this = this
    selects.forEach(function (select) {
      //select.addEventListener('change', selectMenuHandler);
      if (addEvent) select.onchange = selectMenuHandler;

      function selectMenuHandler() {
        _this.setSelectMenuStyles(select, selects, menuContainerSelector, hiddenClassName, activeClassName);
      }
      selectMenuHandler();

      //clearSelectMenu(container);
    });
  }

  setSelectMenuStyles(select, selects, menuContainerSelector, hiddenClassName?, activeClassName?) {
    hiddenClassName = hiddenClassName || 'hidden';
    activeClassName = activeClassName || '';
    var containers = select.closest('.form-group').querySelectorAll(menuContainerSelector);

    if (select.tagName == 'SELECT') {
      for (var container of containers) {
        if (activeClassName) container.classList.remove(activeClassName);
        if (hiddenClassName) container.classList.add(hiddenClassName);
      }
      let index = select.selectedIndex || 0;
      if (containers[index] != undefined) {
        if (hiddenClassName) containers[index].classList.remove(hiddenClassName);
        if (activeClassName) containers[index].classList.add(activeClassName);
      }
    } else {

      for (var thisSelect of selects) {
        var thisContainers = thisSelect.parentElement.querySelectorAll(menuContainerSelector);
        thisContainers.forEach(thisContainer => {
          if (thisContainer) {
            if (thisSelect.checked) {
              if (hiddenClassName) thisContainer.classList.remove(hiddenClassName);
              if (activeClassName) thisContainer.classList.add(activeClassName);
            } else {
              if (hiddenClassName) thisContainer.classList.add(hiddenClassName);
              if (activeClassName) thisContainer.classList.remove(activeClassName);
            }
          }
        });
      }

    }

  }

  /*end old functions*/

  /*sticky*/


  initStickyScroll() {
    const el = document.querySelector('#promotionDisplay') as HTMLElement;
    if (!el) return;
    const root = el.parentElement as HTMLElement;
    if (!root) return;

    const marginTop = 15;
    const marginBottom = 15 * 2;
    let raf: number | null = null;

    // ищем ближайший scrollable родитель
    function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY)) return node;
        node = node.parentElement;
      }
      return node;
    }

    const scrollContainer = getScrollParent(root);

    function getScrollTop() {
      if (scrollContainer === window) return window.scrollY || document.documentElement.scrollTop || 0;
      return (scrollContainer as HTMLElement).scrollTop;
    }

    function getContainerRect() {
      if (scrollContainer === window) return { top: 0, height: window.innerHeight } as any;
      return (scrollContainer as HTMLElement).getBoundingClientRect();
    }

    function update() {
      if (raf != null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = null;

        const containerScroll = getScrollTop();
        const rootRect = root.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const scrollerRect = getContainerRect();
        const viewportH = scrollerRect.height;
        const rootH = rootRect.height;
        const elH = elRect.height;
        const rootOffset = containerScroll + (rootRect.top - scrollerRect.top);

        // -----------------------------
        // ВАЖНО: если элемент меньше scrollable-контейнера — он НЕ ДОЛЖЕН двигаться
        if (elH + marginBottom <= viewportH) {
          el.style.transform = 'none';
          el.style.top = marginTop + 'px';
          el.classList.add('sticky');
          el.classList.remove('stop');
          return;
        }

        // Большой элемент — "лифт" внутри root
        const travel = Math.max(0, rootH - elH - marginBottom);
        const denom = Math.max(1, rootH - viewportH);
        const prog = clamp((containerScroll + marginTop - rootOffset) / denom, 0, 1);
        const translate = prog * travel;

        el.style.transform = `translateY(${Math.round(translate)}px)`;
        el.classList.add('stop');
        el.classList.remove('sticky');
        el.style.top = '';
      });
    }

    function clamp(v: number, a = 0, b = 1) {
      return Math.min(Math.max(v, a), b);
    }

    if (scrollContainer === window) {
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
    } else {
      (scrollContainer as HTMLElement).addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
    }

    // initial
    update();
  }








  /*end sticky*/

  /*abstractControlsOrder*/
  setAbstractControlsOrder(abstractControl: AbstractControl | string, order: number) {
    this.abstractControlOrders = [];

    let data = { abstractControl, order };
    let currentAbstractControl = this.abstractControlOrders.find(item => item.abstractControl == abstractControl);
    if (currentAbstractControl) {
      currentAbstractControl.order = order;
    } else {
      this.abstractControlOrders.push(data)
    }
  }

  getAbstractControlsOrder(abstractControl: AbstractControl | string) {
    let currentAbstractControl = this.abstractControlOrders.find(item => item.abstractControl == abstractControl)
    return currentAbstractControl;
  }

  momentIsDate(date, format) {
    return ((moment(date) as any)._d != 'Invalid Date') && (format ? (moment(date) as any)._f == format : true);
  }

  momentIsSpecificDay(date, dayName) {
    const daysOfWeek = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    const momentDate = moment(date);
    const dayIndex = momentDate.day();
    return dayIndex === daysOfWeek[dayName.toLowerCase()];
  }
  /*end abstractControlsOrder*/

  /*preview handlers*/
  onTemplateUpdated(event) {
    console.log('onTemplateUpdated', event);
  }

  onTemplateSubmit(event) {
    console.log('onTemplateSubmit', event);
  }
}
