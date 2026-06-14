import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
//import * as defaultPromotionData from "../../../../assets/data/defaultPromotionData.json";
//import * as initialisationData from "../../../../assets/data/initialisationData.json";
import { normalizeUrl, validURL, templating, toLowerCase } from '@unsonet/js-utils';
import { lastValueFrom, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  //public initialPromotionData;
  public initialisationData;

  private normalizedBaseApiUrl = (globalThis as any)?.location?.href || '';

  ApiEndpoins: {
    baseApiHost: string,
    promotionDataUrl: string,
    hotelDataUrl: string,
    submitPromotionUrl: string
  } = {
      baseApiHost: this.normalizedBaseApiUrl ? new URL(this.normalizedBaseApiUrl).host : '',
      promotionDataUrl: '',
      hotelDataUrl: '',
      submitPromotionUrl: '',
    };

  constructor(private http: HttpClient) {

  }

  getDefaultInitialisationData(): Observable<any> {
    return this.http.get('assets/data/initialisationData.json');
  }

  getDefaultPromotionData(): Observable<any> {
    return this.http.get('assets/data/defaultPromotionData.json');
  }

  sendServerRequest(url, proxy?, options?): Observable<any> {
    if (!url) {
      return throwError(() => new Error('URL is empty'));
    }
    //let formData  = new FormData();
    let headers = new Headers();
    //let username = environment.securepayCredentials.username;
    //let password = environment.securepayCredentials.password;
    headers.append('Accept', 'application/json, text/plain, */*');
    headers.append('Content-Type', 'application/json');
    headers.append('X-Requested-With', 'XMLHttpRequest');
    //if(document.cookie) headers.append('cookie', document.cookie);
    //headers.append('Authorization', 'Basic ' + btoa(username + ":" + password));
    let normalizedBaseApiUrl = this.normalizedBaseApiUrl;
    let proxyUrl = proxy == 'true' ? `https://cors-anywhere.herokuapp.com/${normalizedBaseApiUrl}` : !proxy || proxy == 'false' ? '' : typeof proxy !== 'undefined' ? proxy : '';
    if (!options) {
      options = {
        withCredentials: true,//credentials: 'include',
        headers: [...(headers as any).entries()].reduce((prev, cur) => {
          prev[cur[0]] = cur[1];
          return prev;
        }, {})
      }
    }

    let newUrl = new URL(normalizedBaseApiUrl);
    if (validURL(url)) {
      url = newUrl.origin + new URL(url).pathname;
    } else {
      url = newUrl.origin + (url[0] == '/' ? url : '/' + url);
    }
    return this.http.get(proxyUrl + url, options || null);
  }

  requestPromotionData(promotionId): Observable<any> {
    let templatingOptions = {
      startSymbols: '{{',
      endSymbols: '}}',
      text: this.ApiEndpoins.promotionDataUrl,
      insideTags: true,
      callbackFn: (word) => {
        let key = word.replace('{{', '').replace('}}', '')?.trim()?.toLowerCase();
        if (key == 'promotionId'.toLowerCase()) {
          return promotionId;
        } else {
          return word;
        }
      }
    };

    let url = templating(templatingOptions);
    return this.sendServerRequest(url);
  }

  requestHotelData(): Observable<any> {
    return this.sendServerRequest(this.ApiEndpoins.hotelDataUrl);
  }


  async getPromotionData(promotionId?) {
    let promotionData = JSON.parse(JSON.stringify(window['promotionData'] || null));
    if (!promotionData) {

      try {
        if (promotionId) {
          if (promotionId.toLowerCase() == 'test') {
            promotionData = await lastValueFrom(this.getDefaultPromotionData());
          } else {
            promotionData = await lastValueFrom(this.requestPromotionData(promotionId));
          }
        } else {
          promotionData = (this.initialisationData ?? await lastValueFrom(this.requestHotelData())).promotionAddEditFormInitialisationData;
        }
      } catch (error) {
        console.log(error);
        promotionData = (this.initialisationData ?? await lastValueFrom(this.requestHotelData())).promotionAddEditFormInitialisationData;
      }

    }

    return promotionData;
  }

  async getInitialisationData() {
    let initialisationData = this.initialisationData = JSON.parse(JSON.stringify(window['initialisationData'] || null)) || this.initialisationData;
    if (!initialisationData) {
      try {
        initialisationData = await lastValueFrom(this.requestHotelData());
      } catch (error) {
        console.log(error);
        initialisationData = await lastValueFrom(await this.getDefaultInitialisationData());
      }
    }

    return initialisationData;
  }

  sendPromotionData(data): Observable<any> {
    let csrfParameterName = document.querySelector("meta[name='_csrf_parameter']").getAttribute('content');
    let csrfParameterValue = document.querySelector("meta[name='" + csrfParameterName + "']").getAttribute('content');

    var req = this.sendServerRequest(this.ApiEndpoins.submitPromotionUrl, null, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfParameterValue
      },
      body: JSON.stringify(data)
    });
    return req;
  }

  // getPromotionLink(): String {

  // }
  // addCategory(Category): void {

  // }
  // getPromotionDates(Date, Date): Map<any> {

  // }
  // getResponsesForDate(Date): List<PromotionResponse> {

  // }
  // addPromotionResponse(PromotionResponse): void {

  // }
  // getCategory(String): Category {

  // }
  // equals(Object): boolean {

  // }
  // hashCode(): number {

  // }
  // compareTo(Promotion): number {

  // }

  getDepartmentEmails(departmentID): Array<any> {
    return this.getDepartmentUsers(departmentID).map(item => item?.emailAddress).filter(item => item);
  }

  getEmailDepartmentID(email) {
    let initialisationData = this?.initialisationData?.promotionAddEditFormInitialisationData;
    let departments = initialisationData.bccDepartments;
    for (let department of departments) {
      let emails = this.getDepartmentEmails(department.id);
      if (emails.includes(email)) {
        return department.id
      }
    }
    return -1;
  }

  getDepartmentUsers(departmentID): Array<any> {
    let initialisationData = this?.initialisationData?.promotionAddEditFormInitialisationData;
    let department = initialisationData.bccDepartments.filter(item => item.id == departmentID)[0];
    return department?.users || [];
  }

  getAdditionDepartmentEmails(allEmails, departmentID) {
    let emails = []
    let users = this.getDepartmentUsers(departmentID);
    let departmentEmails = users.map(item => item.emailAddress);
    allEmails.forEach(element => {
      if (!departmentEmails.includes(element)) {
        emails.push(element);
      }
    });

    return emails;
  }

  getDepartmentTemplates(departmentID): Array<any> {
    if (departmentID == undefined || departmentID == null) return [];
    let initialisationData = this?.initialisationData?.promotionAddEditFormInitialisationData;
    let department = initialisationData?.templateDepartments?.filter(item => item.id == departmentID)?.[0];

    let templates = [];
    if (department?.templates) {
      templates = [...initialisationData.templates].filter(item => department.templates.map(item => item.id).includes(item.id));
    }

    return templates;
  }

  hasDepartmentTemplate(departmentID, templateID) {
    return this.getDepartmentTemplates(departmentID).some(template => template.id == templateID);
  }

  containsDepartmentId(departments, departmentID) {
    return departments.some(department => department.id == departmentID);
  }

  getPreviewTemplate(templateID) {
    var initialisationData = this.initialisationData.promotionAddEditFormInitialisationData;
    var defaultTemplate = initialisationData.templates.filter(item => item?.name?.toLowerCase() == "Default Template".toLowerCase())?.[0]?.html;
    var temp = defaultTemplate;
    if (templateID) {
      var templatesArray = [];
      initialisationData.templateDepartments.forEach(department => department.templates.forEach(template => templatesArray.push(template)));
      var templateInfo = templatesArray.filter(template => +template.id == +templateID);
      var templateData = initialisationData.templates.filter(template => +template.id == +templateInfo?.[0]?.id);
      temp = templateData.length ? templateData[0].html : defaultTemplate;
    }

    return temp;
  }

  setApiEndpoints(endpointsObj) {
    //   ApiEndpoins:{
    //   baseApiHost:string,
    //   promotionDataUrl:string,
    //   requestHotelDataUrl:string,
    //   submitPromotionUrl:string
    // } = {
    //   baseApiHost: getUrlParameter(location.href, "default", true) || getUrlParameter(location.href, "proxy", true) ? 'test.securepay.ae' : location.host,
    //   promotionDataUrl:`/ajax/promotions/getPromotion?promotionUuid={{promotionId}}`,
    //   requestHotelDataUrl:`/admin/ajax/promotions/getPromotionAddEditFormInitialisation`,
    //   submitPromotionUrl:`/admin/promotions/submitPromotion`,
    // };

    let validEndpointsName = Object.keys(this.ApiEndpoins);
    Object.keys(endpointsObj || {}).forEach(endpointName => {
      if (validEndpointsName.includes(endpointName)) {
        let endpoint = endpointsObj[endpointName];
        if (endpointName == 'baseApiHost') {
          let url = normalizeUrl(endpoint);
          if (url) {
            this.normalizedBaseApiUrl = url;
          } else {
            return;
          }
        }
        if (endpoint) {
          this.ApiEndpoins[endpointName] = endpoint;
        }
      }
    });
  }

}
