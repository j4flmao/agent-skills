# htmx Server Integration

## Overview

htmx shifts application logic to the server — the server receives AJAX requests triggered by HTML attributes and returns HTML fragments. This reference covers server-side integration patterns for Django, Flask, Ruby on Rails, Go (Chi/Gin), Node.js (Express), Laravel, ASP.NET Core, and Java Spring Boot, including request detection, response formatting, validation, and common utilities.

## Server Detection of htmx Requests

### Request Headers

htmx sends specific headers with every AJAX request:

```
HX-Request: "true"                    — Always present for htmx requests
HX-Trigger: "button-id"               — ID of the element that triggered the request
HX-Trigger-Name: "button-name"        — Name of the triggered element
HX-Target: "result-div"               — ID of the target element
HX-Current-URL: "https://example.com" — Current page URL
HX-Prompt: "user response"            — Response from hx-prompt
HX-Boosted: "true"                    — Request is from a boosted element
```

### Middleware / Helper

```python
# Django middleware for htmx detection
class HtmxMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.htmx = HtmxRequest(request)
        return self.get_response(request)

class HtmxRequest:
    def __init__(self, request):
        self.request = request

    @property
    def is_htmx(self):
        return self.request.headers.get('HX-Request') == 'true'

    @property
    def boosted(self):
        return self.request.headers.get('HX-Boosted') == 'true'

    @property
    def target(self):
        return self.request.headers.get('HX-Target')

    @property
    def trigger(self):
        return self.request.headers.get('HX-Trigger')

    @property
    def trigger_name(self):
        return self.request.headers.get('HX-Trigger-Name')

    @property
    def current_url(self):
        return self.request.headers.get('HX-Current-URL')

    @property
    def prompt(self):
        return self.request.headers.get('HX-Prompt')

# Usage in view
def my_view(request):
    if request.htmx.is_htmx:
        return render(request, 'partials/_content.html')
    return render(request, 'full_page.html')
```

### Response Headers

Server sends these response headers to control htmx behavior:

```
HX-Push: "/new/url"           — Push URL to history
HX-Replace-Url: "/new/url"    — Replace current URL
HX-Reswap: "innerHTML"        — Override swap strategy
HX-Retarget: "#other-div"     — Override target element
HX-Trigger: "event-name"      — Trigger event on client
HX-Trigger-After-Settle: ""   — Trigger after settle
HX-Trigger-After-Swap: ""     — Trigger after swap
HX-Refresh: "true"            — Full page refresh
HX-Redirect: "/new-page"      — Client-side redirect
HX-Location: "/path"          — Like redirect but swaps content
HX-Stop-Polling: ""           — Stop polling (status 286)
```

## Django Integration

### Installation

```bash
pip install django-htmx
```

```python
# settings.py
INSTALLED_APPS = [
    'django_htmx',
    # ...
]

MIDDLEWARE = [
    'django_htmx.middleware.HtmxMiddleware',
    # ...
]
```

### View Patterns

```python
# views.py
from django.shortcuts import render
from django_htmx.http import HttpResponseClientRedirect
from django_htmx.http import trigger_client_event

def contact_list(request):
    contacts = Contact.objects.all()
    if request.htmx:
        return render(request, 'contacts/_list.html', {'contacts': contacts})
    return render(request, 'contacts/list.html', {'contacts': contacts})

def create_contact(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            contact = form.save()
            response = render(request, 'contacts/_row.html', {'contact': contact})
            response['HX-Trigger'] = 'contact-added'
            return response
        return render(request, 'contacts/_form.html', {'form': form}, status=422)
    form = ContactForm()
    return render(request, 'contacts/_form.html', {'form': form})

def delete_contact(request, pk):
    contact = get_object_or_404(Contact, pk=pk)
    contact.delete()
    return HttpResponse('')  # Empty response removes the row

def search_contacts(request):
    q = request.GET.get('q', '')
    contacts = Contact.objects.filter(name__icontains=q)
    return render(request, 'contacts/_list.html', {'contacts': contacts})

# Using htmx utility functions
def update_contact(request, pk):
    contact = get_object_or_404(Contact, pk=pk)
    form = ContactForm(request.POST or None, instance=contact)

    if form.is_valid():
        form.save()
        # Redirect client with HX-Redirect
        return HttpResponseClientRedirect('/contacts')

    return render(request, 'contacts/_edit.html', {'form': form})

def trigger_event_view(request):
    response = render(request, 'partials/_updated.html')
    trigger_client_event(response, 'data-updated', {'count': 42})
    return response
```

### Template Fragments

```html
<!-- contacts/list.html - full page -->
{% extends 'base.html' %}
{% block content %}
  <div id="contact-list">
    {% include 'contacts/_list.html' %}
  </div>
  <div id="contact-form">
    {% include 'contacts/_form.html' %}
  </div>
{% endblock %}
```

```html
<!-- contacts/_list.html - fragment only -->
{% for contact in contacts %}
  {% include 'contacts/_row.html' %}
{% endfor %}
```

### CSRF Integration

```python
# Django CSRF is handled automatically for same-origin requests.
# For Boosted forms, ensure CSRF token is in the form:
<form hx-post="/contacts">
  {% csrf_token %}
  <input name="name">
  <button type="submit">Add</button>
</form>
```

## Flask Integration

### Installation

```bash
pip install flask-htmx
```

### Setup

```python
from flask import Flask, render_template_string, request
from flask_htmx import HTMX

app = Flask(__name__)
htmx = HTMX(app)
```

### View Patterns

```python
@app.route('/contacts')
def contact_list():
    contacts = Contact.query.all()
    if htmx:
        return render_template('contacts/_list.html', contacts=contacts)
    return render_template('contacts/list.html', contacts=contacts)

@app.route('/contacts', methods=['POST'])
def create_contact():
    form = ContactForm(request.form)
    if form.validate():
        contact = Contact(name=form.name.data, email=form.email.data)
        db.session.add(contact)
        db.session.commit()
        response = make_response(
            render_template('contacts/_row.html', contact=contact)
        )
        response.headers['HX-Trigger'] = 'contact-added'
        return response
    return render_template('contacts/_form.html', form=form), 422

@app.route('/contacts/<int:pk>', methods=['DELETE'])
def delete_contact(pk):
    contact = Contact.query.get_or_404(pk)
    db.session.delete(contact)
    db.session.commit()
    return '', 200

@app.route('/contacts/search')
def search_contacts():
    q = request.args.get('q', '')
    contacts = Contact.query.filter(Contact.name.ilike(f'%{q}%'))
    return render_template('contacts/_list.html', contacts=contacts)
```

## Ruby on Rails Integration

### Setup

```ruby
# Gemfile
gem 'htmx-rails'
```

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  helper_method :htmx_request?

  private

  def htmx_request?
    request.headers['HX-Request'] == 'true'
  end
end
```

### View Patterns

```ruby
# app/controllers/contacts_controller.rb
class ContactsController < ApplicationController
  def index
    @contacts = Contact.all
    render partial: 'contacts/list' if htmx_request?
  end

  def create
    @contact = Contact.new(contact_params)
    if @contact.save
      response.headers['HX-Trigger'] = 'contact-added'
      render partial: 'contacts/contact', locals: { contact: @contact }
    else
      render partial: 'contacts/form', status: :unprocessable_entity
    end
  end

  def destroy
    @contact = Contact.find(params[:id])
    @contact.destroy
    head :ok
  end

  def search
    @contacts = Contact.where('name ILIKE ?', "%#{params[:q]}%")
    render partial: 'contacts/list'
  end

  private

  def contact_params
    params.permit(:name, :email)
  end
end
```

### Turbo vs htmx

Rails developers may compare htmx with Hotwire/Turbo. Key differences:

- htmx sends HTML fragments in response to any event, not just form submissions.
- htmx works with any backend (not just Rails).
- htmx has more flexible swap strategies (beforebegin, afterend, etc.).
- Turbo Streams use a specific XML format; htmx uses plain HTML.

## Go Integration (Chi/Gin)

### Using Chi Router

```go
package main

import (
    "html/template"
    "net/http"
    "github.com/go-chi/chi/v5"
)

func main() {
    r := chi.NewRouter()
    r.Get("/contacts", ListContacts)
    r.Post("/contacts", CreateContact)
    r.Delete("/contacts/{id}", DeleteContact)
    r.Get("/contacts/search", SearchContacts)
    http.ListenAndServe(":8080", r)
}

func isHtmx(r *http.Request) bool {
    return r.Header.Get("HX-Request") == "true"
}

func ListContacts(w http.ResponseWriter, r *http.Request) {
    contacts := getContacts()
    if isHtmx(r) {
        tmpl := template.Must(template.ParseFiles("views/contacts/_list.html"))
        tmpl.Execute(w, contacts)
        return
    }
    tmpl := template.Must(template.ParseFiles("views/contacts/list.html"))
    tmpl.Execute(w, contacts)
}

func CreateContact(w http.ResponseWriter, r *http.Request) {
    r.ParseForm()
    contact := Contact{
        Name:  r.FormValue("name"),
        Email: r.FormValue("email"),
    }

    if contact.Name == "" {
        w.WriteHeader(http.StatusUnprocessableEntity)
        tmpl := template.Must(template.ParseFiles("views/contacts/_form.html"))
        tmpl.Execute(w, map[string]interface{}{
            "Error": "Name is required",
            "Contact": contact,
        })
        return
    }

    saveContact(&contact)
    w.Header().Set("HX-Trigger", "contact-added")
    tmpl := template.Must(template.ParseFiles("views/contacts/_row.html"))
    tmpl.Execute(w, contact)
}

func DeleteContact(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    deleteContact(id)
    w.WriteHeader(http.StatusOK)
}
```

### Using Gin

```go
package main

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

func main() {
    r := gin.Default()
    r.GET("/contacts", handleContacts)
    r.POST("/contacts", handleCreateContact)
    r.DELETE("/contacts/:id", handleDeleteContact)
    r.Run(":8080")
}

func handleContacts(c *gin.Context) {
    if c.GetHeader("HX-Request") == "true" {
        c.HTML(http.StatusOK, "contacts/_list.html", getContacts())
        return
    }
    c.HTML(http.StatusOK, "contacts/list.html", getContacts())
}
```

## Node.js Integration (Express)

### Setup

```javascript
// app.js
const express = require('express')
const app = express()

app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
```

### Middleware

```javascript
// htmx middleware
app.use((req, res, next) => {
  req.htmx = {
    isHtmx: req.headers['hx-request'] === 'true',
    boosted: req.headers['hx-boosted'] === 'true',
    target: req.headers['hx-target'],
    trigger: req.headers['hx-trigger'],
    currentUrl: req.headers['hx-current-url'],
  }
  next()
})
```

### Routes

```javascript
// routes/contacts.js
const router = require('express').Router()

router.get('/', (req, res) => {
  const contacts = getContacts()
  if (req.htmx.isHtmx) {
    return res.render('contacts/_list', { contacts })
  }
  res.render('contacts/list', { contacts })
})

router.post('/', (req, res) => {
  const { name, email } = req.body
  const errors = {}

  if (!name || name.length < 2) errors.name = 'Name required (min 2 chars)'
  if (!email || !email.includes('@')) errors.email = 'Valid email required'

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('contacts/_form', { errors, name, email })
  }

  const contact = createContact({ name, email })
  res.set('HX-Trigger', 'contact-added')
  res.render('contacts/_row', { contact })
})

router.delete('/:id', (req, res) => {
  deleteContact(req.params.id)
  res.status(200).send('')
})

router.get('/search', (req, res) => {
  const contacts = searchContacts(req.query.q)
  res.render('contacts/_list', { contacts })
})

module.exports = router
```

### CSRF with Express

```javascript
// Use csurf or csurf-like middleware
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })

// Apply to all routes
app.use(csrfProtection)

// Pass CSRF token to all templates
app.locals.csrfToken = (req) => req.csrfToken()

// In form:
// <input type="hidden" name="_csrf" value="<%= csrfToken %>" />
```

## Laravel Integration

### Setup

```bash
composer require ajthinking/laravel-htmx
```

### View Patterns

```php
<?php
// routes/web.php
use App\Models\Contact;
use Illuminate\Http\Request;

Route::get('/contacts', function (Request $request) {
    $contacts = Contact::all();
    if ($request->header('HX-Request')) {
        return view('contacts._list', ['contacts' => $contacts]);
    }
    return view('contacts.list', ['contacts' => $contacts]);
});

Route::post('/contacts', function (Request $request) {
    $validated = $request->validate([
        'name' => 'required|min:2',
        'email' => 'required|email',
    ]);

    $contact = Contact::create($validated);

    if ($request->header('HX-Request')) {
        return response()
            ->view('contacts._row', ['contact' => $contact])
            ->header('HX-Trigger', 'contact-added');
    }

    return redirect('/contacts');
});

Route::delete('/contacts/{id}', function ($id) {
    Contact::destroy($id);
    return response('', 200);
});

Route::get('/contacts/search', function (Request $request) {
    $contacts = Contact::where('name', 'like', "%{$request->q}%")->get();
    return view('contacts._list', ['contacts' => $contacts]);
});
```

## ASP.NET Core Integration

### Setup

```bash
dotnet add package Htmx.Net
```

### Middleware

```csharp
// Program.cs
builder.Services.AddHttpContextAccessor();
builder.Services.AddHtmx();
```

### Controller Patterns

```csharp
[ApiController]
public class ContactsController : Controller
{
    private readonly AppDbContext _db;

    public ContactsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("/contacts")]
    public IActionResult Index()
    {
        var contacts = _db.Contacts.ToList();
        if (Request.IsHtmx())
        {
            return PartialView("Contacts/_List", contacts);
        }
        return View("Contacts/List", contacts);
    }

    [HttpPost("/contacts")]
    public IActionResult Create(Contact contact)
    {
        if (!ModelState.IsValid)
        {
            Response.StatusCode = 422;
            return PartialView("Contacts/_Form", contact);
        }

        _db.Contacts.Add(contact);
        _db.SaveChanges();

        Response.Headers.Append("HX-Trigger", "contact-added");
        return PartialView("Contacts/_Row", contact);
    }

    [HttpDelete("/contacts/{id}")]
    public IActionResult Delete(int id)
    {
        var contact = _db.Contacts.Find(id);
        if (contact != null)
        {
            _db.Contacts.Remove(contact);
            _db.SaveChanges();
        }
        return Ok();
    }

    [HttpGet("/contacts/search")]
    public IActionResult Search(string q)
    {
        var contacts = _db.Contacts
            .Where(c => c.Name.Contains(q))
            .ToList();
        return PartialView("Contacts/_List", contacts);
    }
}
```

## Java Spring Boot Integration

### Setup

```xml
<dependency>
    <groupId>io.github.wimdeblauwe</groupId>
    <artifactId>htmx-spring-boot</artifactId>
    <version>3.0.0</version>
</dependency>
```

### Controller

```java
@Controller
public class ContactController {

    @Autowired
    private ContactRepository repository;

    @GetMapping("/contacts")
    public String list(Model model, HtmxRequest htmxRequest) {
        model.addAttribute("contacts", repository.findAll());
        if (htmxRequest.isHtmxRequest()) {
            return "contacts/_list :: content";
        }
        return "contacts/list";
    }

    @PostMapping("/contacts")
    public String create(@Valid Contact contact, BindingResult result,
                        HtmxResponse.Builder htmxResponse) {
        if (result.hasErrors()) {
            htmxResponse.status(422);
            return "contacts/_form :: form";
        }

        repository.save(contact);
        htmxResponse.trigger("contact-added");
        return "contacts/_row :: row";
    }

    @DeleteMapping("/contacts/{id}")
    @ResponseStatus(HttpStatus.OK)
    public void delete(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
```

## Response Headers Reference

| Header | Type | Description | Example |
|--------|------|-------------|---------|
| `HX-Push-Url` | String | Push URL to history | `/new-page` |
| `HX-Replace-Url` | String | Replace current URL | `/current` |
| `HX-Reswap` | String | Override swap behavior | `innerHTML` |
| `HX-Retarget` | CSS Selector | Override target element | `#new-target` |
| `HX-Trigger` | String/JSON | Trigger event on client | `{"showMessage": "Saved"}` |
| `HX-Trigger-After-Settle` | String/JSON | Trigger after settle | `updateComplete` |
| `HX-Trigger-After-Swap` | String/JSON | Trigger after swap | `contentUpdated` |
| `HX-Refresh` | Boolean | Refresh full page | `true` |
| `HX-Redirect` | URL | Client-side redirect | `/login` |
| `HX-Location` | String/JSON | Like redirect, swaps content | `{"path": "/page"}` |
| Status 286 | N/A | Stop polling (deprecated) | `286` |

## CSRF Integration

```html
<!-- Option 1: Include CSRF token in every form -->
<form hx-post="/contacts">
  <input type="hidden" name="_csrf" value="{{csrfToken}}">
  <!-- ... -->
</form>

<!-- Option 2: Global header via htmx config -->
<meta name="csrf-token" content="{{csrfToken}}">

<script>
  document.body.addEventListener('htmx:configRequest', (event) => {
    event.detail.headers['X-CSRF-Token'] =
      document.querySelector('meta[name="csrf-token"]').content
  })
</script>

<!-- Option 3: Per-form with cookie (if csurf is cookie-based) -->
<script>
  document.body.addEventListener('htmx:configRequest', (event) => {
    event.detail.headers['XSRF-TOKEN'] = getCookie('XSRF-TOKEN')
  })
</script>
```
