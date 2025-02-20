import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { Form as FinalForm, FormSpy } from 'react-final-form';
import createDecorator from 'final-form-focus';
import arrayMutators from 'final-form-arrays';
import { FormattedMessage } from 'react-intl';
import { LastVisitedContext } from '@folio/stripes-core';
import { ConfirmationModal } from '@folio/stripes-components';

const focusOnErrors = createDecorator();

class StripesFinalFormWrapper extends Component {
  constructor(props) {
    super(props);

    this.state = {
      openModal: false,
      nextLocation: null,
      dirty: false,
    };
  }

  componentDidMount() {
    const {
      history,
      formOptions: { navigationCheck },
    } = this.props;

    this._isMounted = true;

    if (navigationCheck) {
      this.unblock = history.block(nextLocation => {
        // STRIPESFF-35 / STFORM-42 require the nav-prompt to be ignored
        // on logout. consider calling a common function if this ever needs
        // to be more elaborate; until then, admire this dead-simple impl.
        if (nextLocation.pathname.startsWith('/logout')) {
          return true;
        }

        const {
          dirty,
          submitSucceeded,
          submitting,
        } = this.state;
        const shouldPrompt = dirty && !submitSucceeded && !submitting;

        if (shouldPrompt) {
          this.setState({
            openModal: true,
            nextLocation,
          });
        }

        return !shouldPrompt;
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;

    if (this.props.formOptions.navigationCheck) {
      this.unblock();
    }
  }

  continue = (ctx) => {
    const {
      nextLocation: { pathname, search },
    } = this.state;

    const { history } = this.props;

    ctx.cachePreviousUrl();
    this.unblock();
    history.push(`${pathname}${search}`);
  }

  closeModal = () => {
    this.setState({
      openModal: false,
    });
  }

  renderForm() {
    const {
      onSubmit,
      Form,
      initialValues,
      formOptions,
    } = this.props;
    const {
      mutators,
      decorators = [],
      subscription,
    } = formOptions;

    return (
      <FinalForm
        {...formOptions}
        subscription={{
          initialValues: true,
          submitting: true,
          pristine: true,
          ...subscription,
        }}
        onSubmit={onSubmit}
        decorators={[
          focusOnErrors,
          ...decorators
        ]}
        mutators={{
          ...mutators,
          ...arrayMutators,
        }}
        initialValues={initialValues}
        render={props => (
          <>
            <Form {...this.props} {...props} />
            <FormSpy
              subscription={{
                dirty: true,
                invalid: true,
                submitting: true,
              }}
              onChange={state => {
                if (this._isMounted) {
                  this.setState(state);
                }
              }}
              {...props}
            />
          </>
        )}
      />
    );
  }

  render() {
    const { openModal } = this.state;

    return (
      <LastVisitedContext.Consumer>
        {ctx => (
          <>
            {this.renderForm()}
            <ConfirmationModal
              id="cancel-editing-confirmation"
              open={openModal}
              message={<FormattedMessage id="stripes-form.unsavedChanges" />}
              heading={<FormattedMessage id="stripes-form.areYouSure" />}
              onConfirm={this.closeModal}
              onCancel={() => this.continue(ctx)}
              confirmLabel={<FormattedMessage id="stripes-form.keepEditing" />}
              cancelLabel={<FormattedMessage id="stripes-form.closeWithoutSaving" />}
            />
          </>
        )}
      </LastVisitedContext.Consumer>
    );
  }
}

StripesFinalFormWrapper.propTypes = {
  Form: PropTypes.elementType,
  formOptions: PropTypes.shape({
    decorators: PropTypes.arrayOf(PropTypes.object),
    mutators: PropTypes.object,
    navigationCheck: PropTypes.bool,
    subscription: PropTypes.object
  }),
  history: PropTypes.shape({
    block: PropTypes.func,
    push: PropTypes.func,
  }),
  initialValues: PropTypes.object,
  onSubmit: PropTypes.func,
};

export default withRouter(StripesFinalFormWrapper);
